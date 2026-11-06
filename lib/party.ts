export const party = {
  child: "Alex Morgan Smith",
  childFirst: "Alex",
  age: 4,
  theme: { en: "Racing Car", es: "Racing Car" },
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

export const MAX_PARTY_SIZE = 10;

/** Party size from untrusted input: a whole number from 1 to MAX_PARTY_SIZE (1 when it is not a number). */
export function clampPartySize(value: unknown) {
  return Math.min(Math.max(Math.floor(Number(value)) || 1, 1), MAX_PARTY_SIZE);
}
