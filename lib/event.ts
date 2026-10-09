import type { Client } from "@libsql/client";

export type EventSettings = {
  name: string;
  date: string; // YYYY-MM-DD
  time: string | null;
  place: string | null;
  replyDeadlineDays: number | null;
  /** IANA time zone the event happens in; the Reply deadline closes at the end of its day here. */
  timeZone: string;
};

const defaults: EventSettings = {
  name: "Alex's Birthday",
  date: "2026-12-19",
  time: null,
  place: null,
  replyDeadlineDays: null,
  timeZone: "America/New_York",
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

function cleanTimeZone(zone: string) {
  const trimmed = zone.trim();
  try {
    new Intl.DateTimeFormat("en", { timeZone: trimmed });
  } catch {
    throw new ValidationError("Time zone must be a real one such as America/New_York.");
  }
  return trimmed;
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
        reply_deadline_days INTEGER,
        time_zone TEXT
      )
    `).then(async () => {
      // Databases created before the time zone setting get the column on first use.
      const { rows } = await db.execute("PRAGMA table_info(event_settings)");
      if (!rows.some((r) => r.name === "time_zone")) {
        try {
          await db.execute("ALTER TABLE event_settings ADD COLUMN time_zone TEXT");
        } catch (err) {
          // Another instance may have added it first.
          if (!String(err).includes("duplicate column")) throw err;
        }
      }
    }));

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
      timeZone: row.time_zone === null || row.time_zone === undefined ? defaults.timeZone : String(row.time_zone),
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
      next.timeZone = cleanTimeZone(next.timeZone);
      await db.execute({
        sql: `INSERT INTO event_settings (id, name, date, time, place, reply_deadline_days, time_zone)
              VALUES (1, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET name = excluded.name, date = excluded.date,
                time = excluded.time, place = excluded.place,
                reply_deadline_days = excluded.reply_deadline_days,
                time_zone = excluded.time_zone`,
        args: [next.name, next.date, next.time, next.place, next.replyDeadlineDays, next.timeZone],
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

/** True once the end of the Reply deadline day (in the event's time zone) has passed. False when no deadline is set. */
export function replyDeadlinePassed(event: EventSettings, now: Date): boolean {
  const deadline = replyDeadlineDate(event);
  if (!deadline) return false;
  // en-CA formats as YYYY-MM-DD, which compares correctly as text.
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: event.timeZone }).format(now);
  return today > deadline;
}

/** Time zones offered on the settings screen: [IANA name, label]. */
export const TIME_ZONE_CHOICES: readonly (readonly [string, string])[] = [
  ["America/New_York", "Eastern (New York)"],
  ["America/Chicago", "Central (Chicago)"],
  ["America/Denver", "Mountain (Denver)"],
  ["America/Phoenix", "Mountain, no daylight saving (Phoenix)"],
  ["America/Los_Angeles", "Pacific (Los Angeles)"],
  ["America/Anchorage", "Alaska (Anchorage)"],
  ["Pacific/Honolulu", "Hawaii (Honolulu)"],
  ["America/Mexico_City", "Mexico City"],
  ["America/Bogota", "Bogota"],
  ["America/Lima", "Lima"],
  ["America/Santiago", "Santiago"],
  ["America/Argentina/Buenos_Aires", "Buenos Aires"],
  ["America/Sao_Paulo", "Sao Paulo"],
  ["Europe/London", "London"],
  ["Europe/Madrid", "Madrid"],
  ["Europe/Paris", "Paris"],
  ["Europe/Berlin", "Berlin"],
  ["Europe/Rome", "Rome"],
  ["UTC", "UTC"],
];

/** The choices to show, always including the saved zone even if it is not in the list. */
export function timeZoneOptions(saved: string): readonly (readonly [string, string])[] {
  return TIME_ZONE_CHOICES.some(([zone]) => zone === saved) ? TIME_ZONE_CHOICES : [[saved, saved], ...TIME_ZONE_CHOICES];
}
