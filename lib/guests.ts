import type { Client } from "@libsql/client";

export type Language = "en" | "es";

export type Guest = {
  id: string;
  name: string;
  language: Language;
  notes: string;
  archived: boolean;
};

export type GuestInput = { name: string; language: Language; notes: string };

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
      if (existed) return;
      for (const g of opts.seed ?? []) {
        await db.execute({
          sql: "INSERT INTO guests (id, name, language, notes) VALUES (?, ?, ?, ?)",
          args: [g.id, g.name, g.language ?? "en", g.notes],
        });
      }
    })());

  const toGuest = (row: Record<string, unknown>): Guest => ({
    id: String(row.id),
    name: String(row.name),
    language: row.language as Language,
    notes: String(row.notes),
    archived: Number(row.archived) === 1,
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
      const id = `gst_${crypto.randomUUID()}`;
      await db.execute({
        sql: "INSERT INTO guests (id, name, language, notes) VALUES (?, ?, ?, ?)",
        args: [id, input.name, input.language, input.notes],
      });
      return { id, ...input, archived: false };
    },

    async list(opts: { includeArchived?: boolean } = {}): Promise<Guest[]> {
      await ensure();
      const where = opts.includeArchived ? "" : "WHERE archived = 0";
      const { rows } = await db.execute(`SELECT * FROM guests ${where} ORDER BY created_at, rowid`);
      return rows.map(toGuest);
    },

    async update(id: string, changes: Partial<GuestInput>): Promise<void> {
      await ensure();
      const clean: Partial<GuestInput> = {};
      if (changes.name !== undefined) clean.name = cleanName(changes.name);
      if (changes.language !== undefined) clean.language = cleanLanguage(changes.language);
      if (changes.notes !== undefined) clean.notes = cleanNotes(changes.notes);
      const fields = Object.entries(clean);
      if (fields.length === 0) return;
      await db.execute({
        sql: `UPDATE guests SET ${fields.map(([k]) => `${k} = ?`).join(", ")} WHERE id = ?`,
        args: [...fields.map(([, v]) => v as string), id],
      });
    },

    async archive(id: string): Promise<void> {
      await ensure();
      await db.execute({ sql: "UPDATE guests SET archived = 1 WHERE id = ?", args: [id] });
    },

    async restore(id: string): Promise<void> {
      await ensure();
      await db.execute({ sql: "UPDATE guests SET archived = 0 WHERE id = ?", args: [id] });
    },
  };
}
