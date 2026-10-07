import { choice, TypeSafeClient } from "@typesafe-ai/sdk";
import type { Guest } from "./guests";

export const CONFIRM_THRESHOLD = 0.85;
export const REVIEW_THRESHOLD = 0.4;
/** If the model says "nobody" but a real guest still has at least this probability, flag it for review. */
export const SOFT_THRESHOLD = 0.15;

export type MatchResult = {
  guestId: string | null;
  confidence: number;
  status: "matched" | "review" | "unmatched";
};

const client = new TypeSafeClient();

/** Ask Jev which person on the guest list an RSVP most likely refers to. */
export async function matchGuest(
  input: { name: string; relation: string },
  guests: Pick<Guest, "id" | "name" | "notes">[],
): Promise<MatchResult> {
  const options: Record<string, string | null> = {};
  for (const g of guests) options[g.id] = `${g.name} (${g.notes})`;
  options.none = "Nobody on the list; this person was not invited";

  const response = await client.systemOne({
    state: {
      rsvp_name: input.name,
      rsvp_relation_to_birthday_child: input.relation,
    },
    questions: {
      guest: choice(
        "Which invited guest is the person who submitted this RSVP? " +
          "They may be a guest, or a parent replying for an invited child. " +
          "The RSVP may be written in English or Spanish (e.g. \"la mamá de Mikey\" means \"Mikey's mom\"). " +
          "Allow for nicknames, accents and typos.",
        options,
      ),
    },
  });

  const answer = response.answers.guest;
  const picked = answer.choice as string;
  const probs =
    (answer as { probabilities?: Record<string, number> }).probabilities ?? {};
  const confidence = Number(
    probs[picked] ?? (answer as { confidence?: number }).confidence ?? 0,
  );

  if (picked === "none") {
    // The model thinks this is nobody on the list, but a plausible runner-up
    // is worth the host's attention instead of a flat "unmatched".
    const [bestId, bestP] =
      Object.entries(probs)
        .filter(([id]) => id !== "none")
        .sort((a, b) => b[1] - a[1])[0] ?? [];
    if (bestId && bestP >= SOFT_THRESHOLD)
      return { guestId: bestId, confidence: bestP, status: "review" };
    return { guestId: null, confidence, status: "unmatched" };
  }
  if (confidence >= CONFIRM_THRESHOLD)
    return { guestId: picked, confidence, status: "matched" };
  if (confidence >= REVIEW_THRESHOLD)
    return { guestId: picked, confidence, status: "review" };
  return { guestId: null, confidence, status: "unmatched" };
}
