import Link from "next/link";
import { dictionaries, resolveLocale } from "@/lib/i18n";
import { replyDeadlineDate } from "@/lib/event";
import { formatDate, party } from "@/lib/party";
import { eventStore, replyStore } from "@/lib/stores";
import RacingCar from "../../racing-car";
import LangSync from "../../lang-sync";
import PersonalReplyForm from "./personal-reply-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invitation", robots: { index: false } };

const checker = "repeating-conic-gradient(#111 0% 25%, #fff 0% 50%) 50% / 28px 28px";

/** The Invitation page a Guest reaches through their Personal link. */
export default async function PersonalInvitation(props: PageProps<"/i/[code]">) {
  const { code } = await props.params;
  const { lang } = await props.searchParams;
  const guest = await replyStore.guestForPersonalLink(code);
  // A Guest sees their own language first; the toggle (?lang=) overrides it. Unknown links fall back to the browser.
  const locale = resolveLocale(lang, guest?.language === "es" ? "es" : guest ? "en" : null);
  const t = dictionaries[locale];
  const other = locale === "en" ? "es" : "en";

  const shell = (children: React.ReactNode) => (
    <main className="min-h-screen bg-zinc-900 text-white">
      <LangSync locale={locale} />
      <div className="h-7" style={{ background: checker }} />
      <RacingCar />
      <section className="mx-auto max-w-xl px-5 py-10 text-center">
        <div className="flex justify-end">
          <Link
            href={`/i/${encodeURIComponent(code)}?lang=${other}`}
            hrefLang={other}
            className="rounded-full border border-yellow-400 px-3 py-1 text-sm font-bold text-yellow-400 hover:bg-yellow-400 hover:text-zinc-900"
          >
            🌐 {t.switchTo}
          </Link>
        </div>
        {children}
      </section>
      <div className="h-7" style={{ background: checker }} />
    </main>
  );

  if (!guest) {
    return shell(
      <>
        <h1 className="mt-8 text-3xl font-black uppercase italic text-red-500">{t.linkUnknownTitle}</h1>
        <p className="mt-3 text-zinc-300">{t.linkUnknown}</p>
      </>,
    );
  }

  const event = await eventStore.get();
  const current = await replyStore.currentForPersonalLink(code);
  const deadline = replyDeadlineDate(event);
  const rows: [string, string][] = [
    [t.date, formatDate(event.date, locale)],
    [t.time, event.time ?? t.tbd],
    [t.where, event.place ?? t.tbd],
    [t.rsvpBy, deadline ? formatDate(deadline, locale) : t.tbd],
  ];

  return shell(
    <>
      <p className="mt-4 text-sm font-bold uppercase tracking-[0.3em] text-yellow-400">{t.startEngines}</p>
      <h1 className="mt-2 text-5xl font-black uppercase italic leading-tight text-red-500">{t.hello(guest.name)}</h1>
      <p className="mt-3 text-zinc-300">{t.invited(party.child, party.theme[locale])}</p>

      <dl className="mt-8 grid gap-3 rounded-2xl border-2 border-dashed border-yellow-400 p-5 text-left">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4">
            <dt className="font-bold text-yellow-400">{k}</dt>
            <dd className="text-right">{v}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-10 mb-4 text-2xl font-extrabold uppercase text-yellow-400">{t.inRace}</h2>
      <PersonalReplyForm code={code} locale={locale} current={current} />
    </>,
  );
}
