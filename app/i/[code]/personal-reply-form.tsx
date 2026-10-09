"use client";

import { useState } from "react";
import { CompanionFields, readParty } from "@/app/companion-fields";
import RsvpForm from "@/app/rsvp-form";
import { dictionaries, type Locale } from "@/lib/i18n";
import { ReplySummary, type CurrentReply } from "./reply-summary";

/** The Guest's Reply, read-only, once the Reply deadline has passed. */
export function ClosedReply({ locale, current }: { locale: Locale; current: CurrentReply | null }) {
  return <ReplySummary locale={locale} current={current} closed />;
}

export default function PersonalReplyForm({
  code,
  guestName,
  locale,
  current,
}: {
  code: string;
  guestName: string;
  locale: Locale;
  current: CurrentReply | null;
}) {
  const t = dictionaries[locale];
  // What the Guest has replied so far (the saved Reply, or the one just sent). Shown as a summary, not a form.
  const [saved, setSaved] = useState<CurrentReply | null>(current);
  const [editing, setEditing] = useState(current === null);
  const [thanks, setThanks] = useState(false);
  const [attending, setAttending] = useState<boolean | null>(current?.attending ?? null);
  const [closed, setClosed] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  const [message, setMessage] = useState("");
  const [notMe, setNotMe] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (attending === null) return;
    const form = new FormData(e.currentTarget);
    const party = readParty(form);
    setState("sending");
    try {
      const res = await fetch("/api/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, attending, ...party }),
      });
      if (res.ok) {
        setSaved({ attending, partySize: attending ? party.partySize : 1, companions: attending ? party.companions : [] });
        setThanks(true);
        setEditing(false);
        setState("idle");
      }
      else {
        const error = (await res.json().catch(() => null))?.error;
        if (error === "closed") setClosed(true);
        setMessage(error === "companion_count" ? t.errCompanionCount : error === "companion_incomplete" ? t.errCompanionIncomplete : t.errGeneric);
        setState("error");
      }
    } catch {
      setMessage(t.errGeneric);
      setState("error");
    }
  }

  if (notMe) {
    return (
      <div className="space-y-4">
        <p className="text-zinc-300">{t.notYouIntro}</p>
        <RsvpForm locale={locale} code={code} />
      </div>
    );
  }

  if (closed) return <ClosedReply locale={locale} current={saved} />;

  if (!editing) {
    return (
      <ReplySummary
        locale={locale}
        current={saved}
        thanks={thanks}
        onChange={() => {
          setThanks(false);
          setAttending(saved?.attending ?? null);
          setEditing(true);
        }}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl bg-white p-6 text-zinc-900 shadow-xl">
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
                attending === o.v ? "border-red-600 bg-red-600 text-white" : "border-zinc-300 hover:border-red-400"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      {attending && (
        <CompanionFields
          locale={locale}
          initialPartySize={saved?.attending ? saved.partySize : 1}
          initialCompanions={saved?.attending ? saved.companions : []}
        />
      )}
      {state === "error" && <p className="text-sm font-semibold text-red-700">{message}</p>}
      <button
        disabled={attending === null || state === "sending"}
        className="w-full rounded-lg bg-yellow-400 px-4 py-3 text-lg font-extrabold uppercase tracking-wide text-zinc-900 shadow disabled:opacity-50"
      >
        {state === "sending" ? t.sending : t.sendReply}
      </button>
      <button type="button" onClick={() => setNotMe(true)} className="w-full text-sm font-bold text-zinc-600 underline">
        {t.notYou(guestName)}
      </button>
    </form>
  );
}
