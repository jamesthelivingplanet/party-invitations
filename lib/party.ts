export const party = {
  child: "Alex Morgan Smith",
  childFirst: "Alex",
  theme: { en: "Cars", es: "Cars" },
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
