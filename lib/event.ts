import type { Client } from "@libsql/client";

export type EventSettings = {
  name: string;
  date: string; // YYYY-MM-DD
  time: string | null;
  place: string | null;
  /** Google Maps link for the place, shown as a link next to it. */
  mapUrl: string | null;
  replyDeadlineDays: number | null;
  /** IANA time zone the event happens in; the Reply deadline closes at the end of its day here. */
  timeZone: string;
  /** The birthday child's full name, shown in "You're invited to …'s birthday party". Null leaves it generic. */
  childName: string | null;
  /** The name used in the headline and greetings (usually the first name). */
  childFirstName: string | null;
  /** Party theme, in the invitation sentence ("… Dinosaur theme"). Null leaves it out. */
  theme: string | null;
  /** The age the child turns; null hides the Age row and the age in the invitation sentence. */
  childAge: number | null;
  /** Clothing size for gift-givers; null hides the row. */
  clothingSize: string | null;
  /** The emblem on the racing car's door. */
  emblem: Emblem;
};

export const EMBLEMS = ["star", "planet", "initial"] as const;
export type Emblem = (typeof EMBLEMS)[number];
export const EMBLEM_LABELS: Record<Emblem, string> = { star: "Star", planet: "Red planet", initial: "First letter of the name" };

const defaults: EventSettings = {
  name: "Birthday Party",
  date: "2030-06-15",
  time: null,
  place: null,
  mapUrl: null,
  replyDeadlineDays: null,
  timeZone: "America/New_York",
  childName: null,
  childFirstName: null,
  theme: null,
  childAge: null,
  clothingSize: null,
  emblem: "star",
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

function cleanAge(age: number | null) {
  if (age === null) return null;
  if (!Number.isInteger(age) || age < 0 || age > 120) throw new ValidationError("Age must be a whole number from 0 to 120.");
  return age;
}

function cleanEmblem(emblem: string): Emblem {
  if (!(EMBLEMS as readonly string[]).includes(emblem)) throw new ValidationError("Pick one of the emblems on the list.");
  return emblem as Emblem;
}

function cleanName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new ValidationError("The event needs a name.");
  return trimmed.slice(0, 100);
}

function cleanMapUrl(url: string | null) {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new ValidationError("Map link must be a full web address starting with https://.");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new ValidationError("Map link must be a full web address starting with https://.");
  }
  return trimmed.slice(0, 500);
}

function cleanText(text: string | null) {
  const trimmed = text?.trim();
  return trimmed ? trimmed.slice(0, 200) : null;
}

const text = (v: unknown) => (v === null || v === undefined || String(v) === "" ? null : String(v));

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
        map_url TEXT,
        reply_deadline_days INTEGER,
        time_zone TEXT,
        child_name TEXT,
        child_first_name TEXT,
        theme TEXT,
        child_age INTEGER,
        clothing_size TEXT,
        emblem TEXT
      )
    `).then(async () => {
      // Databases created before the time zone setting get the column on first use.
      const { rows } = await db.execute("PRAGMA table_info(event_settings)");
      for (const column of ["time_zone", "map_url", "child_name", "child_first_name", "theme", "child_age", "clothing_size", "emblem"]) {
        if (rows.some((r) => r.name === column)) continue;
        try {
          await db.execute(`ALTER TABLE event_settings ADD COLUMN ${column} ${column === "child_age" ? "INTEGER" : "TEXT"}`);
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
      mapUrl: row.map_url === null || row.map_url === undefined ? null : String(row.map_url),
      replyDeadlineDays: row.reply_deadline_days === null ? null : Number(row.reply_deadline_days),
      timeZone: row.time_zone === null || row.time_zone === undefined ? defaults.timeZone : String(row.time_zone),
      childName: text(row.child_name),
      childFirstName: text(row.child_first_name),
      theme: text(row.theme),
      childAge: row.child_age === null || row.child_age === undefined ? null : Number(row.child_age),
      clothingSize: text(row.clothing_size),
      emblem: (EMBLEMS as readonly string[]).includes(String(row.emblem)) ? (String(row.emblem) as Emblem) : defaults.emblem,
    };
  }

  return {
    get,

    async update(changes: Partial<EventSettings>): Promise<void> {
      const next = { ...(await get()), ...changes };
      next.name = cleanName(next.name);
      next.time = cleanText(next.time);
      next.place = cleanText(next.place);
      next.mapUrl = cleanMapUrl(next.mapUrl);
      next.date = cleanDate(next.date);
      next.replyDeadlineDays = cleanDeadlineDays(next.replyDeadlineDays);
      next.timeZone = cleanTimeZone(next.timeZone);
      next.childName = cleanText(next.childName);
      next.childFirstName = cleanText(next.childFirstName);
      next.theme = cleanText(next.theme);
      next.clothingSize = cleanText(next.clothingSize);
      next.childAge = cleanAge(next.childAge);
      next.emblem = cleanEmblem(next.emblem);
      await db.execute({
        sql: `INSERT INTO event_settings (id, name, date, time, place, map_url, reply_deadline_days, time_zone,
                                          child_name, child_first_name, theme, child_age, clothing_size, emblem)
              VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET name = excluded.name, date = excluded.date,
                time = excluded.time, place = excluded.place, map_url = excluded.map_url,
                reply_deadline_days = excluded.reply_deadline_days,
                time_zone = excluded.time_zone, child_name = excluded.child_name,
                child_first_name = excluded.child_first_name, theme = excluded.theme, child_age = excluded.child_age,
                clothing_size = excluded.clothing_size, emblem = excluded.emblem`,
        args: [
          next.name, next.date, next.time, next.place, next.mapUrl, next.replyDeadlineDays, next.timeZone,
          next.childName, next.childFirstName, next.theme, next.childAge, next.clothingSize, next.emblem,
        ],
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
