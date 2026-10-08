"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { markSent } from "./actions";

const noop = () => () => {};

const large = "min-h-16 w-full rounded-2xl px-6 text-lg";
const button =
  "inline-flex min-h-11 cursor-pointer items-center justify-center whitespace-nowrap rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-700 disabled:opacity-60";

/**
 * Hands the finished message to the phone's share sheet (ADR 0001), or copies it where there is no share sheet.
 * Either way the Invitation is then marked sent. No phone number or email is involved.
 */
export function ShareButton({ guestId, message, big = false }: { guestId: string; message: string; big?: boolean }) {
  const router = useRouter();
  const canShare = useSyncExternalStore(noop, () => typeof navigator.share === "function", () => false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function share() {
    setBusy(true);
    try {
      await navigator.share({ text: message });
    } catch (err) {
      // The Host closed the share sheet without sending: leave the status alone.
      setBusy(false);
      if (err instanceof DOMException && err.name === "AbortError") return;
      setNote("Sharing failed. Try Copy message instead.");
      return;
    }
    await markSent(guestId, true);
    setBusy(false);
    router.refresh();
  }

  async function copy() {
    setBusy(true);
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      // No clipboard access (plain http, older browsers): show the text so it can be copied by hand.
      window.prompt("Copy this message", message);
    }
    await markSent(guestId, true);
    setNote("Message copied");
    setBusy(false);
    router.refresh();
    setTimeout(() => setNote(""), 2000);
  }

  return (
    <span className={big ? "flex w-full flex-col gap-2" : "inline-flex items-center gap-2"}>
      <button type="button" disabled={busy} onClick={canShare ? share : copy} className={`${button} ${big ? large : ""}`}>
        {canShare ? "Share" : "Copy message"}
      </button>
      <span role="status" className="text-xs text-zinc-600">{note}</span>
    </span>
  );
}
