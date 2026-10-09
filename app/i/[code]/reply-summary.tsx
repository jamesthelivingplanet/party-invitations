import { dictionaries, type Locale } from "@/lib/i18n";
import type { Companion } from "@/lib/replies";

export type CurrentReply = { attending: boolean; partySize: number; companions: Companion[] };

/**
 * The Guest's Reply laid out as a "You're all set" screen: their answer, Party size and Companions.
 * `thanks` adds a thank-you line (right after sending); `onChange` adds the "Change my reply" button;
 * `closed` explains that the Reply deadline has passed instead.
 */
export function ReplySummary({
  locale,
  current,
  thanks = false,
  closed = false,
  onChange,
}: {
  locale: Locale;
  current: CurrentReply | null;
  thanks?: boolean;
  closed?: boolean;
  onChange?: () => void;
}) {
  const t = dictionaries[locale];
  return (
    <div role="status" className="rounded-2xl bg-white p-6 text-center text-zinc-900 shadow-xl">
      {closed ? (
        <>
          <h3 className="text-xl font-extrabold">{t.repliesClosed}</h3>
          <p className="mt-2 text-zinc-600">{t.repliesClosedNote}</p>
        </>
      ) : (
        <>
          <p className="text-4xl">{current?.attending ? "🏁" : "👋"}</p>
          <h3 className="mt-2 text-2xl font-extrabold">{t.allSetTitle}</h3>
          {thanks && <p className="mt-2 text-zinc-600">{t.allSetThanks}</p>}
        </>
      )}
      <div className="mt-4 rounded-xl bg-zinc-100 p-4 text-left">
        <p className="font-bold">{t.yourReply}</p>
        <p data-testid="reply-answer">
          {current ? (current.attending ? t.yourReplyYes(current.partySize) : t.yourReplyNo) : t.yourReplyNone}
        </p>
        {current?.attending && (
          <>
            <p className="mt-3 font-bold">{t.partySizeLabel}</p>
            <p data-testid="reply-party-size">{current.partySize}</p>
            {current.companions.length > 0 && (
              <>
                <p className="mt-3 font-bold">{t.companionsLabel}</p>
                <ul data-testid="reply-companions" className="list-disc pl-5">
                  {current.companions.map((c, i) => (
                    <li key={i}>
                      {c.name} ({c.kind === "adult" ? t.adult : t.child})
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>
      {onChange && !closed && (
        <button
          type="button"
          onClick={onChange}
          className="mt-4 w-full rounded-lg border-2 border-red-600 px-4 py-3 text-lg font-extrabold uppercase tracking-wide text-red-600 hover:bg-red-50"
        >
          {t.changeReply}
        </button>
      )}
    </div>
  );
}
