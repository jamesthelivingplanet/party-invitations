import { googleCalendarUrl } from "@/lib/calendar";
import type { EventSettings } from "@/lib/event";
import { dictionaries, type Locale } from "@/lib/i18n";

const button =
  "rounded-full border border-yellow-400 px-4 py-2 text-sm font-bold text-yellow-400 hover:bg-yellow-400 hover:text-zinc-900";

/** Two ways to save the party: a Google Calendar link and an .ics file (Apple, Outlook and others). */
export default function AddToCalendar({ event, locale, code }: { event: EventSettings; locale: Locale; code?: string }) {
  const t = dictionaries[locale];
  return (
    <div className="mt-4 text-center">
      <p className="text-sm font-bold text-zinc-300">📅 {t.addToCalendar}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer" className={button}>
          Google
        </a>
        <a href={code ? `/api/calendar?code=${encodeURIComponent(code)}` : "/api/calendar"} download="birthday.ics" className={button}>
          {t.calendarOther}
        </a>
      </div>
    </div>
  );
}
