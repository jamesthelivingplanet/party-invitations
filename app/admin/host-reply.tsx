"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { CompanionFields } from "@/app/companion-fields";
import { recordForGuest } from "./actions";

const button =
  "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";
const yes = `${button} bg-emerald-700 text-white shadow-sm hover:bg-emerald-800`;
const no = `${button} bg-white text-zinc-900 ring-1 ring-inset ring-zinc-300 hover:bg-zinc-50`;

function Save({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={yes} disabled={pending}>
      {pending ? "Saving…" : label}
    </button>
  );
}

/**
 * Two buttons for a Guest who has not replied: record what they told the Host in person. "Can't come" asks first
 * ("are you sure?"), "Coming" opens Party size and Companions. Both can be undone from the Coming / Declined lists.
 */
export function HostReply({ guestId, name, partnerName }: { guestId: string; name: string; partnerName: string | null }) {
  const [mode, setMode] = useState<"idle" | "yes" | "no">("idle");
  const ref = useRef<HTMLFormElement>(null);

  return (
    <form ref={ref} action={recordForGuest} onSubmit={() => setTimeout(() => setMode("idle"), 0)} className="w-full">
      <input type="hidden" name="guest" value={guestId} />
      <input type="hidden" name="answer" value={mode === "no" ? "no" : "yes"} />
      {mode === "idle" ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={yes} onClick={() => setMode("yes")} aria-label={`${name} is coming`}>
            ✓ Coming
          </button>
          <button type="button" className={no} onClick={() => setMode("no")} aria-label={`${name} can't come`}>
            ✕ Can&apos;t come
          </button>
        </div>
      ) : mode === "no" ? (
        <div role="alertdialog" className="rounded-xl bg-amber-50 p-3 ring-1 ring-inset ring-amber-200">
          <p className="text-sm font-semibold text-zinc-900">Mark {name} as can&apos;t come?</p>
          <p className="mt-0.5 text-xs text-zinc-600">They&apos;ll move to Declined. You can undo it there.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Save label="Yes, can't come" />
            <button type="button" className={no} onClick={() => setMode("idle")}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 rounded-xl bg-zinc-50 p-3 ring-1 ring-inset ring-zinc-200">
          <p className="text-sm font-semibold text-zinc-900">{name} is coming</p>
          <CompanionFields locale="en" label={`How many people, including ${name}?`} />
          {partnerName && (
            <label className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
              <input type="checkbox" name="withPartner" className="size-5" />
              Coming with {partnerName}
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            <Save label="Save as coming" />
            <button type="button" className={no} onClick={() => setMode("idle")}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
