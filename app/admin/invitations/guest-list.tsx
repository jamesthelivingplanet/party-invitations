"use client";

import { useState } from "react";
import type { InvitationRow } from "@/lib/invitations";
import { resetGuestMessage, saveGuestMessage, setGuestLanguage, toggleSent } from "./actions";
import { HostReply } from "../host-reply";
import { ShareButton } from "./share-button";

const label = "mb-1.5 block text-sm font-semibold text-zinc-800";
const field =
  "block min-h-11 w-full min-w-0 rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-base text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/15 sm:text-sm";
const primary =
  "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-700";

const statusLabel = { not_sent: "Not sent", sent: "Sent", replied: "Replied" } as const;
const statusStyle = {
  not_sent: "bg-zinc-100 text-zinc-700 ring-zinc-300",
  sent: "bg-sky-50 text-sky-800 ring-sky-200",
  replied: "bg-emerald-50 text-emerald-800 ring-emerald-200",
} as const;

/**
 * Every Guest with their Invitation status. All Guests are loaded once; "All Guests" / "Not replied"
 * only filter them here, so switching is instant. The choice is mirrored in the address (?filter=not-replied)
 * without a server round trip.
 */
export function GuestList({
  rows,
  messages,
  initialNotReplied,
}: {
  rows: InvitationRow[];
  messages: Record<string, string>;
  initialNotReplied: boolean;
}) {
  const [notReplied, setNotReplied] = useState(initialNotReplied);
  const [query, setQuery] = useState("");

  function choose(value: boolean) {
    setNotReplied(value);
    try {
      window.history.replaceState(null, "", value ? "/admin/invitations?filter=not-replied" : "/admin/invitations");
    } catch {
      // The address is only a convenience.
    }
  }

  const plain = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const needle = plain(query.trim());
  const shown = (notReplied ? rows.filter((r) => r.status !== "replied") : rows).filter((r) => !needle || plain(r.name).includes(needle));
  const pill = (active: boolean) =>
    `inline-flex min-h-11 cursor-pointer items-center rounded-xl px-4 ring-1 ring-inset ${active ? "bg-zinc-900 text-white ring-zinc-900" : "bg-white text-zinc-800 ring-zinc-300"}`;

  return (
    <>
      <input
        type="search"
        aria-label="Search Guests"
        placeholder="Search Guests"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className={field}
      />
      <div role="group" aria-label="Filter" className="flex gap-2 text-sm font-semibold">
        <button type="button" aria-pressed={!notReplied} onClick={() => choose(false)} className={pill(!notReplied)}>
          All Guests
        </button>
        <button type="button" aria-pressed={notReplied} onClick={() => choose(true)} className={pill(notReplied)}>
          Not replied
        </button>
      </div>
      {shown.length === 0 ? (
        <p className="text-sm text-zinc-600">{needle ? "No Guests match your search." : notReplied ? "Everyone has replied." : "No Guests yet."}</p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-2xl bg-white ring-1 ring-zinc-200">
          {shown.map((r) => (
            <li key={r.guestId} data-guest={r.name} className="space-y-2 p-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="min-w-0 break-words font-semibold text-zinc-900">{r.name}</span>
                <form action={setGuestLanguage}>
                  <input type="hidden" name="guest" value={r.guestId} />
                  <select
                    name="language"
                    aria-label={`Message language for ${r.name}`}
                    defaultValue={r.language}
                    onChange={(e) => e.currentTarget.form?.requestSubmit()}
                    className="min-h-11 rounded-xl border border-zinc-300 bg-white px-2 text-sm font-medium text-zinc-700"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                  </select>
                </form>
                <span data-testid="status" className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusStyle[r.status]}`}>
                  {statusLabel[r.status]}
                </span>
                {r.hasCustomMessage && <span data-testid="edited" className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">Edited</span>}
                {r.sentAt && <time dateTime={r.sentAt} className="text-xs text-zinc-500">sent {new Date(r.sentAt).toISOString().slice(0, 16).replace("T", " ")} UTC</time>}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <ShareButton guestId={r.guestId} message={messages[r.guestId] ?? ""} />
                <form action={toggleSent}>
                  <input type="hidden" name="guest" value={r.guestId} />
                  <input type="hidden" name="sent" value={r.sentAt ? "0" : "1"} />
                  <button className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-zinc-700 underline-offset-2 hover:underline">
                    {r.sentAt ? "Mark not sent" : "Mark sent"}
                  </button>
                </form>
              </div>
              {r.status !== "replied" && <HostReply guestId={r.guestId} name={r.name} partnerName={r.partnerName} />}
              <details className="group">
                <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-zinc-700 underline-offset-2 hover:underline">Edit message</summary>
                <div className="space-y-3 pt-2">
                  <form action={saveGuestMessage} className="space-y-3">
                    <input type="hidden" name="guest" value={r.guestId} />
                    <label htmlFor={`msg-${r.guestId}`} className={label}>Message for {r.name} only</label>
                    <textarea id={`msg-${r.guestId}`} name="body" defaultValue={messages[r.guestId] ?? ""} rows={10} maxLength={2000} className={field} />
                    <button className={primary}>Save for {r.name} only</button>
                  </form>
                  {r.hasCustomMessage && (
                    <form action={resetGuestMessage}>
                      <input type="hidden" name="guest" value={r.guestId} />
                      <button className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-rose-700 underline-offset-2 hover:underline">Reset to main message</button>
                    </form>
                  )}
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
