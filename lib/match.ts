import { choice, TypeSafeClient } from "@typesafe-ai/sdk";
import type { Guest } from "./guests";

/** What Jev said: the option it picked ("none" for nobody) and its probability for each option. */
export type JevAnswer = { picked: string; probabilities: Record<string, number> };

const client = new TypeSafeClient();

/** Ask Jev which person on the guest list an RSVP most likely refers to. */
export async function askJev(
  input: { name: string; relation: string },
  guests: Pick<Guest, "id" | "name" | "notes">[],
): Promise<JevAnswer> {
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
  const probabilities = {
    ...((answer as { probabilities?: Record<string, number> }).probabilities ?? {}),
  };
  probabilities[picked] ??= Number((answer as { confidence?: number }).confidence ?? 0);
  return { picked, probabilities };
}
