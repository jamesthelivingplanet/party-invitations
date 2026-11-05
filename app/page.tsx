import { headers } from "next/headers";
import Link from "next/link";
import { dictionaries, resolveLocale } from "@/lib/i18n";
import { replyDeadlineDate } from "@/lib/event";
import { formatDate, party } from "@/lib/party";
import { eventStore, replyStore } from "@/lib/stores";
import AddToCalendar from "./add-to-calendar";
import RacingCar from "./racing-car";
import LangSync from "./lang-sync";
import RsvpForm from "./rsvp-form";

const checker =
  "repeating-conic-gradient(#111 0% 25%, #fff 0% 50%) 50% / 28px 28px";

export default async function Home(props: PageProps<"/">) {
  const { lang } = await props.searchParams;
  const locale = resolveLocale(lang, (await headers()).get("accept-language"));
  const t = dictionaries[locale];
  const other = locale === "en" ? "es" : "en";
  const event = await eventStore.get();
  const deadline = replyDeadlineDate(event);
  const open = await replyStore.repliesOpen();

  const rows: [string, React.ReactNode][] = [
    [t.date, formatDate(event.date, locale)],
    [t.time, event.time ?? t.tbd],
    [
      t.where,
      event.place && event.mapUrl ? (
        <a href={event.mapUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-yellow-400 underline-offset-4 hover:text-yellow-400">
          {event.place} 📍
        </a>
      ) : (
        (event.place ?? t.tbd)
      ),
    ],
    [t.rsvpBy, deadline ? formatDate(deadline, locale) : t.tbd],
  ];

  return (
    <main className="min-h-screen bg-zinc-900 text-white">
      <LangSync locale={locale} />
      <div className="h-7" style={{ background: checker }} />
      <RacingCar />
      <section className="mx-auto max-w-xl px-5 py-10 text-center">
        <div className="flex justify-end">
          <Link
            href={`/?lang=${other}`}
            hrefLang={other}
            className="rounded-full border border-yellow-400 px-3 py-1 text-sm font-bold text-yellow-400 hover:bg-yellow-400 hover:text-zinc-900"
          >
            🌐 {t.switchTo}
          </Link>
        </div>
        <p className="mt-4 text-sm font-bold uppercase tracking-[0.3em] text-yellow-400">
          {t.startEngines}
        </p>
        <h1 className="mt-2 text-5xl font-black uppercase italic leading-tight text-red-500">
          {t.title(party.childFirst)}
        </h1>
        <p className="mt-3 text-zinc-300">{t.invited(party.child, party.theme[locale])}</p>

        <dl className="mt-8 grid gap-3 rounded-2xl border-2 border-dashed border-yellow-400 p-5 text-left">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <dt className="font-bold text-yellow-400">{k}</dt>
              <dd className="text-right">{v}</dd>
            </div>
          ))}
        </dl>
        <AddToCalendar event={event} locale={locale} />

        <h2 className="mt-10 mb-4 text-2xl font-extrabold uppercase text-yellow-400">
          {t.inRace}
        </h2>
        {open ? (
          <RsvpForm locale={locale} />
        ) : (
          <p role="status" className="rounded-2xl bg-white p-6 text-xl font-extrabold text-zinc-900 shadow-xl">
            {t.repliesClosed}
          </p>
        )}
      </section>
      <div className="h-7" style={{ background: checker }} />
    </main>
  );
}
