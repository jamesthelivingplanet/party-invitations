import type { EventSettings } from "./event";

type Clock = { h: number; m: number };

function toClock(h: string, m: string | undefined, meridiem: string | undefined): Clock | null {
  let hour = Number(h);
  const minute = m ? Number(m) : 0;
  if (minute > 59) return null;
  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    hour = (hour % 12) + (meridiem.toLowerCase().startsWith("p") ? 12 : 0);
  } else if (hour > 23) return null;
  return { h: hour, m: minute };
}

/** Reads the free-text Time ("2:00 PM - 8:00 PM", "2-8pm", "14:00 - 20:00"); null when it has no clear start. */
export function parseTimeRange(text: string | null): { start: Clock; end: Clock | null } | null {
  if (!text) return null;
  const part = String.raw`(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?)?`;
  const found = new RegExp(`^\\s*${part}\\s*(?:[-–—]|to|a|hasta)?\\s*(?:${part})?\\s*$`, "i").exec(text);
  if (!found) return null;
  const [, h1, m1, mer1, h2, m2, mer2] = found;
  const start = toClock(h1, m1, (mer1 ?? mer2)?.replace(/\./g, ""));
  if (!start) return null;
  const end = h2 ? toClock(h2, m2, mer2?.replace(/\./g, "")) : null;
  return { start, end };
}

/** The UTC instant for a wall-clock time on a date in an IANA time zone. */
export function zonedToUtc(date: string, clock: Clock, timeZone: string): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const wanted = Date.UTC(y, mo - 1, d, clock.h, clock.m);
  const offsetAt = (t: number) => {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric",
      }).formatToParts(new Date(t)).map((p) => [p.type, Number(p.value)]),
    );
    return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - Math.floor(t / 1000) * 1000;
  };
  const first = wanted - offsetAt(wanted);
  return new Date(wanted - offsetAt(first));
}

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const dayStamp = (iso: string) => iso.replace(/-/g, "");
const nextDay = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
};

/** Start and end of the event: timed when the Time can be read, otherwise an all-day event. */
export function eventWindow(event: EventSettings): { allDay: false; start: Date; end: Date } | { allDay: true; start: string; end: string } {
  const range = parseTimeRange(event.time);
  if (!range) return { allDay: true, start: event.date, end: nextDay(event.date) };
  const start = zonedToUtc(event.date, range.start, event.timeZone);
  let end = range.end ? zonedToUtc(event.date, range.end, event.timeZone) : new Date(start.getTime() + 3 * 3600_000);
  if (end <= start) end = new Date(end.getTime() + 24 * 3600_000);
  return { allDay: false, start, end };
}

export function googleCalendarUrl(event: EventSettings, details?: string): string {
  const w = eventWindow(event);
  const dates = w.allDay ? `${dayStamp(w.start)}/${dayStamp(w.end)}` : `${stamp(w.start)}/${stamp(w.end)}`;
  const params = new URLSearchParams({ action: "TEMPLATE", text: event.name, dates });
  if (event.place) params.set("location", event.place);
  const note = [details, event.mapUrl].filter(Boolean).join("\n");
  if (note) params.set("details", note);
  return `https://calendar.google.com/calendar/render?${params}`;
}

const escapeText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

export function buildIcs(event: EventSettings, now: Date, details?: string): string {
  const w = eventWindow(event);
  const note = [details, event.mapUrl].filter(Boolean).join("\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Party Invitations//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:birthday-${event.date}@party-invitations`,
    `DTSTAMP:${stamp(now)}`,
    // Same UID plus a higher SEQUENCE tells calendar apps this is an update to the saved event, not a duplicate or a repeat to ignore.
    `SEQUENCE:${Math.floor(now.getTime() / 1000)}`,
    w.allDay ? `DTSTART;VALUE=DATE:${dayStamp(w.start)}` : `DTSTART:${stamp(w.start)}`,
    w.allDay ? `DTEND;VALUE=DATE:${dayStamp(w.end)}` : `DTEND:${stamp(w.end)}`,
    `SUMMARY:${escapeText(event.name)}`,
    ...(event.place ? [`LOCATION:${escapeText(event.place)}`] : []),
    ...(note ? [`DESCRIPTION:${escapeText(note)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}

/** The event as strangers may see it: no place, so no map link either. */
export function withoutLocation(event: EventSettings): EventSettings {
  return { ...event, place: null, mapUrl: null };
}
