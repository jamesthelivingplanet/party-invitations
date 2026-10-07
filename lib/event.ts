import type { Client } from "@libsql/client";

export type EventSettings = {
  name: string;
  date: string; // YYYY-MM-DD
  time: string | null;
  place: string | null;
  replyDeadlineDays: number | null;
};

const defaults: EventSettings = {
  name: "Alex's Birthday",
  date: "2026-12-19",
  time: null,
  place: null,
  replyDeadlineDays: null,
};

export class ValidationError extends Error {}

function cleanDate(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const real =
    match &&
    new Date(Date.UTC(+match[1], +match[2] - 1, +match[3])).toISOString().slice(0, 10) === date;
  if (!real) throw new ValidationError("Date must be a real day written as YYYY-MM-DD.");
  return date;
}

function cleanDeadlineDays(days: number | null) {
  if (days === null) return null;
  if (!Number.isInteger(days) || days < 0 || days > 365) {
    throw new ValidationError("Reply deadline must be a whole number of days from 0 to 365.");
  }
  return days;
}

function cleanName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new ValidationError("The event needs a name.");
  return trimmed.slice(0, 100);
}

function cleanText(text: string | null) {
  const trimmed = text?.trim();
  return trimmed ? trimmed.slice(0, 200) : null;
}

export function createEventStore(db: Client) {
  let ready: Promise<unknown> | null = null;
  const ensure = () =>
    (ready ??= db.execute(`
      CREATE TABLE IF NOT EXISTS event_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT,
        place TEXT,
        reply_deadline_days INTEGER
      )
    `));

  async function get(): Promise<EventSettings> {
    await ensure();
    const { rows } = await db.execute("SELECT * FROM event_settings WHERE id = 1");
    const row = rows[0];
    if (!row) return { ...defaults };
    return {
      name: String(row.name),
      date: String(row.date),
      time: row.time === null ? null : String(row.time),
      place: row.place === null ? null : String(row.place),
      replyDeadlineDays: row.reply_deadline_days === null ? null : Number(row.reply_deadline_days),
    };
  }

  return {
    get,

    async update(changes: Partial<EventSettings>): Promise<void> {
      const next = { ...(await get()), ...changes };
      next.name = cleanName(next.name);
      next.time = cleanText(next.time);
      next.place = cleanText(next.place);
      next.date = cleanDate(next.date);
      next.replyDeadlineDays = cleanDeadlineDays(next.replyDeadlineDays);
      await db.execute({
        sql: `INSERT INTO event_settings (id, name, date, time, place, reply_deadline_days)
              VALUES (1, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET name = excluded.name, date = excluded.date,
                time = excluded.time, place = excluded.place,
                reply_deadline_days = excluded.reply_deadline_days`,
        args: [next.name, next.date, next.time, next.place, next.replyDeadlineDays],
      });
    },
  };
}

/** The last day replies are accepted: the event date minus the deadline days, or null if unset. */
export function replyDeadlineDate(event: EventSettings): string | null {
  if (event.replyDeadlineDays === null) return null;
  const [y, m, d] = event.date.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d - event.replyDeadlineDays));
  return day.toISOString().slice(0, 10);
}
