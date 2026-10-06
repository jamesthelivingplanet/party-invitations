// Use null for anything not decided yet; the page shows a translated "TBD".
export const party = {
  child: "Alex Morgan Smith",
  childFirst: "Alex",
  theme: { en: "Cars", es: "Cars" },
  dateISO: "2026-12-19", // yyyy-mm-dd
  time: null as string | null, // e.g. "2:00 PM – 5:00 PM"
  place: null as string | null, // e.g. "123 Main St, Springfield"
  rsvpByISO: null as string | null, // yyyy-mm-dd
};

export function formatDate(iso: string, locale: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
