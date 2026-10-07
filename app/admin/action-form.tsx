"use client";

import { useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { decide } from "./actions";

type Intent = "assign" | "new" | "dismiss";
type Variant = "primary" | "secondary" | "danger";

const base =
  "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";
const variants: Record<Variant, string> = {
  primary: `${base} bg-zinc-900 text-white shadow-sm hover:bg-zinc-700 active:bg-zinc-800`,
  secondary: `${base} bg-white text-zinc-900 ring-1 ring-inset ring-zinc-300 hover:bg-zinc-50 active:bg-zinc-100`,
  danger: `${base} bg-white text-rose-700 ring-1 ring-inset ring-rose-300 hover:bg-rose-50 active:bg-rose-100`,
};

function questionFor(intent: Intent, data: FormData, guestNames: Record<string, string>) {
  if (intent === "assign") {
    const name = guestNames[String(data.get("guest_id") ?? "")] ?? "this guest";
    return { text: `Confirm this reply as ${name}?`, detail: "They'll move to your Coming / Declined list." };
  }
  if (intent === "new") {
    const name = String(data.get("new_name") ?? "").trim();
    return { text: `Add “${name}” as a new guest?`, detail: "They'll be counted in your headcount." };
  }
  return { text: "Mark this reply as not invited?", detail: "It won't be counted. You can bring it back later." };
}

function SubmitButton({ variant }: { variant: Variant }) {
  const { pending } = useFormStatus();
  return (
    <button className={variants[variant === "danger" ? "danger" : "primary"]} disabled={pending}>
      {pending ? "Saving…" : "Yes, confirm"}
    </button>
  );
}

/**
 * A decision form with a two-step flow: the trigger button first asks
 * "are you sure?" and only submits the server action once confirmed.
 */
export function ActionForm({
  id,
  intent,
  label,
  variant = "secondary",
  guestNames,
  className = "",
  children,
}: {
  id: number;
  intent: Intent;
  label: string;
  variant?: Variant;
  guestNames: Record<string, string>;
  className?: string;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const [ask, setAsk] = useState<{ text: string; detail: string } | null>(null);

  function open() {
    const form = ref.current;
    if (!form || !form.reportValidity()) return;
    setAsk(questionFor(intent, new FormData(form), guestNames));
  }

  return (
    <form ref={ref} action={decide} className={className}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="intent" value={intent} />
      {children}

      {ask ? (
        <div
          role="alertdialog"
          aria-live="polite"
          className="mt-3 rounded-xl bg-amber-50 p-3 ring-1 ring-inset ring-amber-200 first:mt-0"
        >
          <p className="text-sm font-semibold text-zinc-900">{ask.text}</p>
          <p className="mt-0.5 text-xs text-zinc-600">{ask.detail}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <SubmitButton variant={variant} />
            <button type="button" className={variants.secondary} onClick={() => setAsk(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={open} className={`${variants[variant]} w-full ${children ? "mt-3" : ""}`}>
          {label}
        </button>
      )}
    </form>
  );
}
