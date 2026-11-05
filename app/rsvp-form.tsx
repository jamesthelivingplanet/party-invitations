"use client";

import { useState } from "react";
import { CompanionFields, readParty } from "./companion-fields";
import { dictionaries, type Locale } from "@/lib/i18n";

type Location = { place: string | null; mapUrl: string | null; googleUrl: string; ics: string };

/** Where the party is, plus calendar buttons: shown only after the Guest list recognised the replier. */
function RevealedLocation({ locale, location }: { locale: Locale; location: Location }) {
  const t = dictionaries[locale];
  function saveIcs() {
    const url = URL.createObjectURL(new Blob([location.ics], { type: "text/calendar" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "party-invitations.ics";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const button = "rounded-full border-2 border-zinc-900 px-4 py-2 text-sm font-bold hover:bg-zinc-900 hover:text-white";
  return (
    <div className="mt-5 border-t border-zinc-200 pt-4">
      {location.place && (
        <p className="font-bold">
          {t.where}:{" "}
          {location.mapUrl ? (
            <a href={location.mapUrl} target="_blank" rel="noopener noreferrer" className="underline">
              {location.place} 📍
            </a>
          ) : (
            location.place
          )}
        </p>
      )}
      <p className="mt-3 text-sm font-bold">📅 {t.addToCalendar}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <a href={location.googleUrl} target="_blank" rel="noopener noreferrer" className={button}>
          Google
        </a>
        <button type="button" onClick={saveIcs} className={button}>
          {t.calendarOther}
        </button>
      </div>
    </div>
  );
}

/** The Shared link form. With a Personal link `code` it is the "Not [name]?" form: same Matching, same outcomes. */
export default function RsvpForm({ locale, code }: { locale: Locale; code?: string }) {
  const t = dictionaries[locale];
  const [attending, setAttending] = useState<boolean | null>(null);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [outcome, setOutcome] = useState<"confirmed" | "review" | "no_match">("confirmed");
  // What the visitor already told us, kept for the Request if nobody matches.
  const [draft, setDraft] = useState<{ name: string; relation: string; partySize: number; companions: ReturnType<typeof readParty>["companions"] } | null>(null);
  const [message, setMessage] = useState("");
  // The place, sent back only after a confident Match of someone who is coming (see /api/rsvp).
  const [location, setLocation] = useState<Location | null>(null);
  // Belongs to this visitor only: ties a follow-up call to this Reply (see /api/review-contact and /api/request).
  const [token, setToken] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (attending === null) return;
    const form = new FormData(e.currentTarget);
    setState("sending");
    const party = readParty(form);
    const res = await fetch("/api/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        relation: form.get("relation"),
        ...party,
        attending,
        code,
      }),
    });
    if (res.ok) {
      const json = await res.json().catch(() => null);
      const result = json?.outcome;
      setToken(typeof json?.token === "string" ? json.token : "");
      setLocation(json?.location && typeof json.location.ics === "string" ? json.location : null);
      setOutcome(result === "review" || result === "no_match" ? result : "confirmed");
      if (result === "no_match") setDraft({ name: String(form.get("name")), relation: String(form.get("relation")), ...party });
      setState("done");
    } else {
      const error = (await res.json().catch(() => null))?.error;
      setMessage(
        error === "missing_fields"
          ? t.errMissing
          : error === "closed"
            ? t.repliesClosed
            : error === "companion_count"
            ? t.errCompanionCount
            : error === "companion_incomplete"
              ? t.errCompanionIncomplete
              : t.errGeneric,
      );
      setState("error");
    }
  }

  if (state === "done" && outcome === "no_match" && draft) {
    return <RequestForm locale={locale} draft={draft} attending={attending} code={code} matchToken={token} />;
  }

  if (state === "done") {
    const confirmed = outcome === "confirmed";
    return (
      <div className="rounded-2xl bg-white p-8 text-center text-zinc-900 shadow-xl">
        <p className="text-4xl">{attending ? "🏁" : "👋"}</p>
        <h3 className="mt-2 text-2xl font-extrabold">
          {!confirmed ? t.doneReviewTitle : attending ? t.doneConfirmedTitle : t.doneNoTitle}
        </h3>
        <p className="mt-2 text-zinc-600">
          {!confirmed ? t.doneReview : attending ? t.doneYes : t.doneNo}
        </p>
        {location && <RevealedLocation locale={locale} location={location} />}
        {!confirmed && token && <ReviewContact locale={locale} token={token} />}
      </div>
    );
  }

  const input =
    "mt-1 w-full rounded-lg border-2 border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-red-600";

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl bg-white p-6 text-zinc-900 shadow-xl">
      <label className="block font-bold">
        {t.yourName}
        <input name="name" required maxLength={100} className={input} placeholder={t.yourNamePh} />
      </label>
      <label className="block font-bold">
        {t.relation}
        <input
          name="relation"
          required
          maxLength={200}
          className={input}
          placeholder={t.relationPh}
        />
      </label>
      <div>
        <p className="font-bold">{t.canYouMakeIt}</p>
        <div className="mt-1 grid grid-cols-2 gap-3">
          {[
            { v: true, label: t.yes },
            { v: false, label: t.no },
          ].map((o) => (
            <button
              key={String(o.v)}
              type="button"
              onClick={() => setAttending(o.v)}
              className={`rounded-lg border-2 px-3 py-2 font-bold transition ${
                attending === o.v
                  ? "border-red-600 bg-red-600 text-white"
                  : "border-zinc-300 hover:border-red-400"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      {attending && <CompanionFields locale={locale} />}
      {state === "error" && <p className="text-sm font-semibold text-red-700">{message}</p>}
      <button
        disabled={attending === null || state === "sending"}
        className="w-full rounded-lg bg-yellow-400 px-4 py-3 text-lg font-extrabold uppercase tracking-wide text-zinc-900 shadow disabled:opacity-50"
      >
        {state === "sending" ? t.sending : t.send}
      </button>
    </form>
  );
}

/** Optional, after a reply goes to review: a way for the Host to reach the visitor. Does not block the reply. */
function ReviewContact({ locale, token }: { locale: Locale; token: string }) {
  const t = dictionaries[locale];
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const contact = String(new FormData(e.currentTarget).get("contact") ?? "").trim();
    if (!contact) return;
    setState("sending");
    const res = await fetch("/api/review-contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, contact }),
    });
    setState(res.ok ? "done" : "error");
  }

  if (state === "done") return <p className="mt-6 text-sm font-semibold text-zinc-700">{t.reviewContactThanks}</p>;
  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-2 text-left">
      <label className="block text-sm font-bold">
        {t.reviewContactLabel}
        <input name="contact" maxLength={500} placeholder={t.reviewContactPh} className={fieldClass} />
      </label>
      {state === "error" && <p className="text-sm font-semibold text-red-700">{t.errGeneric}</p>}
      <button
        disabled={state === "sending"}
        className="w-full rounded-lg border-2 border-zinc-300 px-4 py-2 font-bold text-zinc-900 disabled:opacity-50"
      >
        {state === "sending" ? t.sending : t.reviewContactSend}
      </button>
    </form>
  );
}

const fieldClass =
  "mt-1 w-full rounded-lg border-2 border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-red-600";

/** Shown when the Shared link finds no Match: a friendly form whose answer is saved as a Request. */
function RequestForm({
  locale,
  draft,
  attending,
  code,
  matchToken,
}: {
  code?: string;
  matchToken: string;
  locale: Locale;
  draft: { name: string; relation: string; partySize: number; companions: ReturnType<typeof readParty>["companions"] };
  attending: boolean | null;
}) {
  const t = dictionaries[locale];
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const field = (k: string) => String(form.get(k) ?? "");
    setState("sending");
    const res = await fetch("/api/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: field("name"),
        attending,
        code,
        matchToken,
        partySize: draft.partySize,
        companions: draft.companions,
        ownWords: field("ownWords"),
        contacts: {
          phone: field("phone"),
          email: field("email"),
          whatsapp: field("whatsapp"),
          messenger: field("messenger"),
          other: field("other"),
        },
      }),
    });
    if (res.ok) return setState("done");
    const error = (await res.json().catch(() => null))?.error;
    setMessage(
      error === "name_required"
        ? t.errRequestName
        : error === "contact_required"
          ? t.errRequestContact
          : error === "companion_count"
            ? t.errCompanionCount
            : error === "companion_incomplete"
              ? t.errCompanionIncomplete
              : t.errGeneric,
    );
    setState("error");
  }

  if (state === "done") {
    return (
      <div className="rounded-2xl bg-white p-8 text-center text-zinc-900 shadow-xl">
        <p className="text-4xl">🏁</p>
        <h3 className="mt-2 text-2xl font-extrabold">{t.requestDoneTitle}</h3>
        <p className="mt-2 text-zinc-600">{t.requestDone}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4 rounded-2xl bg-white p-6 text-zinc-900 shadow-xl">
      <div>
        <h3 className="text-xl font-extrabold">{t.requestTitle}</h3>
        <p className="mt-1 text-zinc-600">{t.requestIntro}</p>
      </div>
      <label className="block font-bold">
        {t.yourName}
        <input name="name" required maxLength={100} defaultValue={draft.name} className={fieldClass} />
      </label>
      <p className="font-bold">{t.requestContactHint}</p>
      {(
        [
          ["phone", t.contactPhone, "tel"],
          ["email", t.contactEmail, "email"],
          ["whatsapp", t.contactWhatsapp, "tel"],
          ["messenger", t.contactMessenger, "text"],
          ["other", t.contactOther, "text"],
        ] as const
      ).map(([name, label, type]) => (
        <label key={name} className="block text-sm font-semibold">
          {label}
          <input name={name} type={type} maxLength={200} className={fieldClass} />
        </label>
      ))}
      <label className="block font-bold">
        {t.requestWords}
        <textarea name="ownWords" rows={3} maxLength={1000} defaultValue={draft.relation} className={fieldClass} />
      </label>
      {state === "error" && <p className="text-sm font-semibold text-red-700">{message}</p>}
      <button
        disabled={state === "sending"}
        className="w-full rounded-lg bg-yellow-400 px-4 py-3 text-lg font-extrabold uppercase tracking-wide text-zinc-900 shadow disabled:opacity-50"
      >
        {state === "sending" ? t.sending : t.sendRequest}
      </button>
    </form>
  );
}
