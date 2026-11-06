import { createClient, type Client } from "@libsql/client";

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL ?? "file:local.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Columns added after the first release; applied to existing databases on first use.
const LATER_COLUMNS: [string, string][] = [
  ["contact_token", "TEXT"], // unguessable token given to the visitor of a review Reply, to attach optional contact details
  ["review_contact", "TEXT"], // those optional details; shown only to the Host
  ["decision", "TEXT"], // host decision: 'assigned' | 'new_guest' | 'dismissed' | NULL
  ["assigned_guest_id", "TEXT"],
  ["new_guest_name", "TEXT"],
  ["companions", "TEXT"], // JSON list of { name, kind: "adult" | "child" }; NULL on older replies
  ["children", "TEXT"], // JSON list of { name, kind: "adult" | "child" | null } for a household's children; NULL when not asked
  ["answered_by_guest_id", "TEXT"], // the partner who said this Guest is coming with them; NULL when the Guest replied themselves
  ["linked_with_guest_id", "TEXT"], // the partner a Personal-link replier was linked with when replying; NULL if none
  ["withdrawn", "INTEGER"], // 1 when the partner who gave this Reply took it back (said No, or coming without them); NULL otherwise
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
  // Jev's weak guess for a visitor it could not place, waiting for the Request they may leave. Host-only data.
  await client.execute(`
    CREATE TABLE IF NOT EXISTS match_guesses (
      token TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      guest_id TEXT,
      guest_name TEXT,
      confidence REAL,
      jev_unavailable INTEGER NOT NULL DEFAULT 0
    )
  `);
  await addMissingColumns(client, "rsvps", LATER_COLUMNS);
  await addMissingColumns(client, "requests", REQUEST_LATER_COLUMNS);
}

const REQUEST_LATER_COLUMNS: [string, string][] = [
  ["guess_guest_id", "TEXT"], // Jev's closest Guest when too unsure to place the person
  ["guess_guest_name", "TEXT"],
  ["guess_confidence", "REAL"],
  ["jev_unavailable", "INTEGER"], // 1 when Jev could not be reached
];

async function addMissingColumns(client: Client, table: string, columns: [string, string][]) {
  const info = await client.execute(`PRAGMA table_info(${table})`);
  const have = new Set(info.rows.map((r) => String(r.name)));
  for (const [col, type] of columns) {
    if (have.has(col)) continue;
    try {
      await client.execute(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
    } catch (err) {
      // Another instance may have added it first.
      if (!String(err).includes("duplicate column")) throw err;
    }
  }
}
