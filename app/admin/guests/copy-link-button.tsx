"use client";

import { useState } from "react";

/** Copies a Guest's Personal link (this site's address plus their code) to the clipboard. */
export function CopyLinkButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const path = `/i/${code}`;

  async function copy() {
    const link = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // No clipboard access (older browsers, plain http): show the link so it can be copied by hand.
      window.prompt("Copy this link", link);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      data-personal-path={path}
      onClick={copy}
      className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-zinc-700 underline-offset-2 hover:underline"
    >
      {copied ? "Link copied" : "Copy link"}
    </button>
  );
}
