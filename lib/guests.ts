import type { Client } from "@libsql/client";

export type Language = "en" | "es";

export type Guest = {
  id: string;
  name: string;
  language: Language;
  notes: string;
  archived: boolean;
  /** The unguessable code carried in the Guest's Personal link. */
  personalLinkCode: string;
  /** The other Guest in this Guest's household of two, or null. Linking is mutual. */
  partnerId: string | null;
  /** The Host marked this Guest as having children, so the Invitation page asks about them. */
  hasChildren: boolean;
};

export type GuestInput = { name: string; language: Language; notes: string; hasChildren?: boolean };

export class ValidationError extends Error {}

function cleanName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new ValidationError("A guest needs a name.");
  return trimmed;
}

function cleanNotes(notes: string) {
  if (notes.length > 500) throw new ValidationError("Notes can be at most 500 characters.");
  return notes;
}

function cleanLanguage(language: string): Language {
  if (language !== "en" && language !== "es") {
    throw new ValidationError("Language must be English or Spanish.");
  }
  return language;
}

/** 128 bits of randomness, written as 22 URL-safe characters. */
function newPersonalLinkCode() {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64url");
}

const LATER_COLUMNS: [string, string][] = [
  ["personal_link_code", "TEXT"],
  ["partner_id", "TEXT"], // the other Guest in a household of two; kept on both sides
  ["has_children", "INTEGER"], // 1 when the Host marked the Guest as having children; NULL or 0 otherwise
];

export type SeedGuest = { id: string; name: string; notes: string; language?: Language };

export function createGuestStore(db: Client, opts: { seed?: SeedGuest[] } = {}) {
  let ready: Promise<void> | null = null;
  const ensure = () =>
    (ready ??= (async () => {
      // Seed only when this call creates the table, so a host's later edits stick.
      const existed = (
        await db.execute("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'guests'")
      ).rows.length > 0;
      await db.execute(`
        CREATE TABLE IF NOT EXISTS guests (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          language TEXT NOT NULL,
          notes TEXT NOT NULL,
          archived INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
      // Columns added after the first release; NULL on Guests from before them.
      const columns = await db.execute("PRAGMA table_info(guests)");
      for (const [col, type] of LATER_COLUMNS) {
        if (columns.rows.some((r) => r.name === col)) continue;
        try {
          await db.execute(`ALTER TABLE guests ADD COLUMN ${col} ${type}`);
        } catch (err) {
          // Another instance may have added it first.
          if (!String(err).includes("duplicate column")) throw err;
        }
      }
      if (!existed) {
        for (const g of opts.seed ?? []) {
          await db.execute({
            sql: "INSERT INTO guests (id, name, language, notes) VALUES (?, ?, ?, ?)",
            args: [g.id, g.name, g.language ?? "en", g.notes],
          });
        }
      }
      // Guests from before Personal links existed (and the seed) get a code here.
      const missing = await db.execute("SELECT id FROM guests WHERE personal_link_code IS NULL");
      for (const row of missing.rows) {
        await db.execute({
          sql: "UPDATE guests SET personal_link_code = ? WHERE id = ? AND personal_link_code IS NULL",
          args: [newPersonalLinkCode(), String(row.id)],
        });
      }
      await db.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS guests_personal_link_code ON guests (personal_link_code)",
      );
    })());

  const toGuest = (row: Record<string, unknown>): Guest => ({
    id: String(row.id),
    name: String(row.name),
    language: row.language as Language,
    notes: String(row.notes),
    archived: Number(row.archived) === 1,
    personalLinkCode: String(row.personal_link_code),
    partnerId: row.partner_id == null ? null : String(row.partner_id),
    hasChildren: Number(row.has_children) === 1,
  });

  return {
    async add(input: GuestInput): Promise<Guest> {
      await ensure();
      input = {
        ...input,
        name: cleanName(input.name),
        language: cleanLanguage(input.language),
        notes: cleanNotes(input.notes),
      };
      const hasChildren = input.hasChildren === true;
      const id = `gst_${crypto.randomUUID()}`;
      const personalLinkCode = newPersonalLinkCode();
      await db.execute({
        sql: "INSERT INTO guests (id, name, language, notes, personal_link_code, has_children) VALUES (?, ?, ?, ?, ?, ?)",
        args: [id, input.name, input.language, input.notes, personalLinkCode, hasChildren ? 1 : 0],
      });
      return { id, name: input.name, language: input.language, notes: input.notes, archived: false, personalLinkCode, partnerId: null, hasChildren };
    },

    async list(opts: { includeArchived?: boolean } = {}): Promise<Guest[]> {
      await ensure();
      const where = opts.includeArchived ? "" : "WHERE archived = 0";
      const { rows } = await db.execute(`SELECT * FROM guests ${where} ORDER BY created_at, rowid`);
      return rows.map(toGuest);
    },

    async update(id: string, changes: Partial<GuestInput>): Promise<void> {
      await ensure();
      // Column name to cleaned value; only these columns can ever be changed here.
      const clean: Record<string, string | number> = {};
      if (changes.name !== undefined) clean.name = cleanName(changes.name);
      if (changes.language !== undefined) clean.language = cleanLanguage(changes.language);
      if (changes.notes !== undefined) clean.notes = cleanNotes(changes.notes);
      if (changes.hasChildren !== undefined) clean.has_children = changes.hasChildren === true ? 1 : 0;
      const fields = Object.entries(clean);
      if (fields.length === 0) return;
      await db.execute({
        sql: `UPDATE guests SET ${fields.map(([k]) => `${k} = ?`).join(", ")} WHERE id = ?`,
        args: [...fields.map(([, v]) => v), id],
      });
    },

    async archive(id: string): Promise<void> {
      await ensure();
      await db.execute({ sql: "UPDATE guests SET archived = 1 WHERE id = ?", args: [id] });
    },

    /** Gives the Guest a new Personal link code; the old code stops working. Returns the new code. */
    async regeneratePersonalLink(id: string): Promise<string> {
      await ensure();
      const code = newPersonalLinkCode();
      const { rows } = await db.execute({ sql: "SELECT personal_link_code FROM guests WHERE id = ?", args: [id] });
      await db.execute({ sql: "UPDATE guests SET personal_link_code = ? WHERE id = ?", args: [code, id] });
      // A saved one-off message carries the old link; point it at the new one.
      const old = rows[0] && String(rows[0].personal_link_code);
      const table = await db.execute("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'invitations'");
      if (old && table.rows.length > 0) {
        await db.execute({
          sql: "UPDATE invitations SET message = REPLACE(message, ?, ?) WHERE guest_id = ? AND message IS NOT NULL",
          args: [`/i/${old}`, `/i/${code}`, id],
        });
      }
      return code;
    },

    /**
     * Links two Guests as partners (a household of two), on both sides; null unlinks. Any earlier partner of either
     * Guest is unlinked first, so a Guest is only ever in one household.
     */
    async setPartner(id: string, partnerId: string | null): Promise<void> {
      await ensure();
      if (partnerId !== null) {
        const { rows } = await db.execute({ sql: "SELECT 1 FROM guests WHERE id = ? AND archived = 0", args: [partnerId] });
        if (partnerId === id || rows.length === 0) throw new ValidationError("Pick another active guest as the partner.");
      }
      await db.batch([
        { sql: "UPDATE guests SET partner_id = NULL WHERE partner_id IN (?, ?) OR id IN (?, ?)", args: [id, partnerId ?? id, id, partnerId ?? id] },
        ...(partnerId
          ? [
              { sql: "UPDATE guests SET partner_id = ? WHERE id = ?", args: [partnerId, id] },
              { sql: "UPDATE guests SET partner_id = ? WHERE id = ?", args: [id, partnerId] },
            ]
          : []),
      ], "write");
    },

    async restore(id: string): Promise<void> {
      await ensure();
      await db.execute({ sql: "UPDATE guests SET archived = 0 WHERE id = ?", args: [id] });
    },
  };
}
