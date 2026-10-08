import { createClient, type Client } from "@libsql/client";

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL ?? "file:local.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Columns added after the first release; applied to existing databases on first use.
const LATER_COLUMNS: [string, string][] = [
  ["decision", "TEXT"], // host decision: 'assigned' | 'new_guest' | 'dismissed' | NULL
  ["assigned_guest_id", "TEXT"],
  ["new_guest_name", "TEXT"],
  ["companions", "TEXT"], // JSON list of { name, kind: "adult" | "child" }; NULL on older replies
];

export async function ensureRsvpSchema(client: Client) {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS rsvps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      name TEXT NOT NULL,
      relation TEXT NOT NULL,
      attending INTEGER NOT NULL,
      party_size INTEGER NOT NULL,
      matched_guest_id TEXT,
      confidence REAL,
      status TEXT NOT NULL
    )
  `);
  // Requests: people who are not on the Guest list, with ways to reach them. Kept apart from rsvps so they never count.
  await client.execute(`
    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      name TEXT NOT NULL,
      attending INTEGER,
      party_size INTEGER NOT NULL,
      companions TEXT NOT NULL,
      source TEXT NOT NULL,
      own_words TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      whatsapp TEXT NOT NULL,
      messenger TEXT NOT NULL,
      other_contact TEXT NOT NULL
    )
  `);
  const info = await client.execute("PRAGMA table_info(rsvps)");
  const have = new Set(info.rows.map((r) => String(r.name)));
  for (const [col, type] of LATER_COLUMNS) {
    if (have.has(col)) continue;
    try {
      await client.execute(`ALTER TABLE rsvps ADD COLUMN ${col} ${type}`);
    } catch (err) {
      // Another instance may have added it first.
      if (!String(err).includes("duplicate column")) throw err;
    }
  }
}
