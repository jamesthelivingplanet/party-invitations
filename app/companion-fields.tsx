"use client";

import { useState } from "react";
import { dictionaries, type Locale } from "@/lib/i18n";

type Companion = { name: string; kind: "adult" | "child" };

const input =
  "mt-1 w-full rounded-lg border-2 border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-red-600";

/** Party size, plus one name-and-label row for each Companion (Party size minus one). Shown only when coming. */
export function CompanionFields({
  locale,
  initialPartySize = 1,
  initialCompanions = [],
}: {
  locale: Locale;
  initialPartySize?: number;
  initialCompanions?: Companion[];
}) {
  const t = dictionaries[locale];
  const [size, setSize] = useState(initialPartySize);

  return (
    <>
      <label className="block font-bold">
        {t.howMany}
        <input
          name="partySize"
          type="number"
          min={1}
          max={10}
          value={size}
          onChange={(e) => setSize(Math.min(Math.max(Math.floor(Number(e.target.value)) || 1, 1), 10))}
          className={input}
        />
      </label>
      {Array.from({ length: size - 1 }, (_, i) => (
        <fieldset key={i} className="rounded-lg border-2 border-dashed border-zinc-300 p-3">
          <legend className="px-1 text-sm font-bold text-zinc-600">{t.companionN(i + 1)}</legend>
          <input
            name={`companion-name-${i}`}
            required
            maxLength={100}
            defaultValue={initialCompanions[i]?.name ?? ""}
            aria-label={t.companionName(i + 1)}
            placeholder={t.companionName(i + 1)}
            className={input}
          />
          <select
            name={`companion-kind-${i}`}
            required
            defaultValue={initialCompanions[i]?.kind ?? ""}
            aria-label={t.companionKind(i + 1)}
            className={input}
          >
            <option value="" disabled>
              {t.adultOrChild}
            </option>
            <option value="adult">{t.adult}</option>
            <option value="child">{t.child}</option>
          </select>
        </fieldset>
      ))}
    </>
  );
}

/** Reads Party size and Companions back out of a form that used CompanionFields. */
export function readParty(form: FormData): { partySize: number; companions: Companion[] } {
  const partySize = Number(form.get("partySize")) || 1;
  const companions = Array.from({ length: partySize - 1 }, (_, i) => ({
    name: String(form.get(`companion-name-${i}`) ?? ""),
    kind: String(form.get(`companion-kind-${i}`) ?? "") as Companion["kind"],
  }));
  return { partySize, companions };
}
