import { createClient } from "@libsql/client";

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL ?? "file:local.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

let ready: Promise<void> | null = null;

// Columns added after the first release; applied to existing databases on first use.
const LATER_COLUMNS: [string, string][] = [
  ["decision", "TEXT"], // host decision: 'assigned' | 'new_guest' | 'dismissed' | NULL
  ["assigned_guest_id", "TEXT"],
  ["new_guest_name", "TEXT"],
];

export function ensureSchema() {
  ready ??= (async () => {
    await db.execute(`
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
    const info = await db.execute("PRAGMA table_info(rsvps)");
    const have = new Set(info.rows.map((r) => String(r.name)));
    for (const [col, type] of LATER_COLUMNS) {
      if (have.has(col)) continue;
      try {
        await db.execute(`ALTER TABLE rsvps ADD COLUMN ${col} ${type}`);
      } catch (err) {
        // Another instance may have added it first.
        if (!String(err).includes("duplicate column")) throw err;
      }
    }
  })();
  return ready;
}

export type RsvpRow = {
  id: number;
  created_at: string;
  name: string;
  relation: string;
  attending: number;
  party_size: number;
  matched_guest_id: string | null;
  confidence: number | null;
  status: "matched" | "review" | "unmatched";
  decision: "assigned" | "new_guest" | "dismissed" | null;
  assigned_guest_id: string | null;
  new_guest_name: string | null;
};
