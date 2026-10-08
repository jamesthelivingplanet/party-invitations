"use client";

import { useState } from "react";
import { CompanionFields, readParty } from "@/app/companion-fields";
import RsvpForm from "@/app/rsvp-form";
import { dictionaries, type Locale } from "@/lib/i18n";

export default function PersonalReplyForm({
  code,
  guestName,
  locale,
  current,
}: {
  code: string;
  guestName: string;
  locale: Locale;
  current: { attending: boolean; partySize: number; companions: { name: string; kind: "adult" | "child" }[] } | null;
}) {
  const t = dictionaries[locale];
  const [attending, setAttending] = useState<boolean | null>(current?.attending ?? null);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [notMe, setNotMe] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (attending === null) return;
    const form = new FormData(e.currentTarget);
    setState("sending");
    try {
      const res = await fetch("/api/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, attending, ...readParty(form) }),
      });
      if (res.ok) setState("done");
      else {
        const error = (await res.json().catch(() => null))?.error;
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

  if (state === "done") {
    return (
      <div className="rounded-2xl bg-white p-8 text-center text-zinc-900 shadow-xl">
        <p className="text-4xl">{attending ? "🏁" : "👋"}</p>
        <h3 className="mt-2 text-2xl font-extrabold">{attending ? t.doneYesTitle : t.doneNoTitle}</h3>
        <p className="mt-2 text-zinc-600">{attending ? t.doneYes : t.doneNo}</p>
      </div>
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
          initialPartySize={current?.attending ? current.partySize : 1}
          initialCompanions={current?.attending ? current.companions : []}
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
