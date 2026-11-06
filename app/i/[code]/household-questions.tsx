"use client";

import { useState } from "react";
import { dictionaries, type Locale } from "@/lib/i18n";
import { clampPartySize, MAX_PARTY_SIZE } from "@/lib/party";
import type { Child } from "@/lib/replies";

const input =
  "mt-1 w-full rounded-lg border-2 border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-red-600";

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

/** A yes/no question answered with two buttons, like "Can you make it?". */
export function YesNo({
  locale,
  question,
  value,
  onChange,
}: {
  locale: Locale;
  question: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  const t = dictionaries[locale];
  return (
    <div role="group" aria-label={question}>
      <p className="font-bold">{question}</p>
      <div className="mt-1 grid grid-cols-2 gap-3">
        {[
          { v: true, label: t.yesShort },
          { v: false, label: t.noShort },
        ].map((o) => (
          <button
            key={String(o.v)}
            type="button"
            aria-pressed={value === o.v}
            onClick={() => onChange(o.v)}
            className={`rounded-lg border-2 px-3 py-2 font-bold transition ${
              value === o.v ? "border-red-600 bg-red-600 text-white" : "border-zinc-300 hover:border-red-400"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** How many children are coming, plus an optional name and adult/child label for each. */
export function ChildrenFields({ locale, initial }: { locale: Locale; initial: Child[] }) {
  const t = dictionaries[locale];
  const start = Math.max(initial.length, 1);
  // What the box shows (may be empty while typing) and the number of rows shown.
  const [text, setText] = useState(String(start));
  const [count, setCount] = useState(start);

  return (
    <>
      <label className="block font-bold">
        {t.howManyChildren}
        <input
          name="childrenCount"
          type="number"
          min={1}
          max={MAX_PARTY_SIZE}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (e.target.value.trim() !== "") setCount(clampPartySize(e.target.value));
          }}
          onBlur={() => {
            const fixed = clampPartySize(text);
            setCount(fixed);
            setText(String(fixed));
          }}
          className={input}
        />
      </label>
      <p className="text-sm text-zinc-600">{t.childrenOptional}</p>
      {Array.from({ length: count }, (_, i) => (
        <fieldset key={i} className="rounded-lg border-2 border-dashed border-zinc-300 p-3">
          <legend className="px-1 text-sm font-bold text-zinc-600">{t.childN(i + 1)}</legend>
          <input
            name={`child-name-${i}`}
            maxLength={100}
            defaultValue={initial[i]?.name ?? ""}
            aria-label={t.childName(i + 1)}
            placeholder={t.childName(i + 1)}
            className={input}
          />
          <select name={`child-kind-${i}`} defaultValue={initial[i]?.kind ?? ""} aria-label={t.childKind(i + 1)} className={input}>
            <option value="">{t.adultOrChildOptional}</option>
            <option value="adult">{t.adult}</option>
            <option value="child">{t.child}</option>
          </select>
        </fieldset>
      ))}
    </>
  );
}

/** Reads the children back out of a form that used ChildrenFields ("" for a label left blank). */
export function readChildrenFields(form: FormData): Child[] {
  const count = clampPartySize(form.get("childrenCount"));
  return Array.from({ length: count }, (_, i) => ({
    name: String(form.get(`child-name-${i}`) ?? "").trim(),
    kind: (String(form.get(`child-kind-${i}`) ?? "") || null) as Child["kind"],
  }));
}
