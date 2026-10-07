import type { ReactNode } from "react";
import type { Guest } from "@/lib/guests";
import { decide } from "./actions";
import { ActionForm } from "./action-form";

const label = "mb-1.5 block text-sm font-semibold text-zinc-800";
const field =
  "block min-h-11 w-full min-w-0 rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-base text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/15 sm:text-sm";

/** A bare form for low-risk, instantly reversible actions (undo). */
function PlainForm({
  id,
  children,
}: {
  id: number;
  children: ReactNode;
}) {
  return (
    <form action={decide}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="intent" value="undo" />
      {children}
    </form>
  );
}

export function UndoButton({ id, label = "Undo" }: { id: number; label?: string }) {
  return (
    <PlainForm id={id}>
      <button className="rounded-md px-1.5 py-1 text-sm font-semibold text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900">
        {label}
      </button>
    </PlainForm>
  );
}

function Panel({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section className="rounded-xl bg-white p-4 ring-1 ring-zinc-200">
      <h4 className="text-sm font-bold text-zinc-900">{title}</h4>
      <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{hint}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** Decision controls for one reply that needs the host's call. */
export function ReviewActions({
  id,
  suggestedGuestId,
  repliedName,
  guests,
}: {
  id: number;
  suggestedGuestId: string | null;
  repliedName: string;
  guests: Guest[];
}) {
  const suggested = guests.find((g) => g.id === suggestedGuestId);
  const guestNames = Object.fromEntries(guests.map((g) => [g.id, g.name]));
  const common = { id, guestNames };

  return (
    <div className="mt-4 space-y-3 border-t border-zinc-100 pt-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {suggested && (
          <ActionForm {...common} intent="assign" label={`Confirm as ${suggested.name}`} variant="primary" className="sm:col-span-2">
            <input type="hidden" name="guest_id" value={suggested.id} />
          </ActionForm>
        )}
        <ActionForm {...common} intent="dismiss" label="Not invited" variant="danger" className="sm:col-span-2" />
      </div>

      <details className="group rounded-2xl bg-zinc-50 ring-1 ring-inset ring-zinc-200">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-zinc-800 marker:hidden hover:bg-zinc-100 [&::-webkit-details-marker]:hidden">
          <span>Someone else or a new guest</span>
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            className="h-4 w-4 shrink-0 text-zinc-500 transition-transform group-open:rotate-180"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m5 7.5 5 5 5-5" />
          </svg>
        </summary>

        <div className="space-y-3 px-3 pb-3">
          <Panel title="On my guest list" hint="Pick who this reply is really from.">
            <ActionForm {...common} intent="assign" label="Assign to this guest" variant="secondary">
              <label htmlFor={`g-${id}`} className={label}>
                Guest
              </label>
              <select id={`g-${id}`} name="guest_id" defaultValue={suggestedGuestId ?? ""} required className={field}>
                <option value="" disabled>
                  Choose a guest…
                </option>
                {guests.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </ActionForm>
          </Panel>

          <Panel title="Not on my list, but welcome" hint="Add them as a new guest. They'll be counted in your headcount.">
            <ActionForm {...common} intent="new" label="Add as new guest" variant="secondary">
              <label htmlFor={`n-${id}`} className={label}>
                Guest name
              </label>
              <input
                id={`n-${id}`}
                name="new_name"
                defaultValue={repliedName}
                required
                maxLength={100}
                autoComplete="off"
                placeholder="e.g. Michael from work"
                className={field}
              />
            </ActionForm>
          </Panel>
        </div>
      </details>
    </div>
  );
}
