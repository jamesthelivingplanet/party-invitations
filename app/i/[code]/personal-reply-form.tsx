"use client";

import { useState } from "react";
import { dictionaries, type Locale } from "@/lib/i18n";

export default function PersonalReplyForm({ code, locale }: { code: string; locale: Locale }) {
  const t = dictionaries[locale];
  const [attending, setAttending] = useState<boolean | null>(null);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (attending === null) return;
    const form = new FormData(e.currentTarget);
    setState("sending");
    try {
      const res = await fetch("/api/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, attending, partySize: Number(form.get("partySize")) }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
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

  const input =
    "mt-1 w-full rounded-lg border-2 border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-red-600";

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
        <label className="block font-bold">
          {t.howMany}
          <input name="partySize" type="number" min={1} max={10} defaultValue={1} className={input} />
        </label>
      )}
      {state === "error" && <p className="text-sm font-semibold text-red-700">{t.errGeneric}</p>}
      <button
        disabled={attending === null || state === "sending"}
        className="w-full rounded-lg bg-yellow-400 px-4 py-3 text-lg font-extrabold uppercase tracking-wide text-zinc-900 shadow disabled:opacity-50"
      >
        {state === "sending" ? t.sending : t.sendReply}
      </button>
    </form>
  );
}
