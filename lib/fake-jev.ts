import type { Jev } from "./replies";

/**
 * A stand-in for Jev used only by the browser tests (E2E_FAKE_JEV=1).
 * A name that is exactly a guest's first name is a sure match; "Maybe <first name>" is an unsure one;
 * anything else is nobody.
 */
export const fakeJev: Jev = async (input, guests) => {
  const name = input.name.trim().toLowerCase();
  const unsure = name.startsWith("maybe ");
  const first = unsure ? name.slice("maybe ".length) : name;
  const hit = guests.find((g) => g.name.split(" ")[0].toLowerCase() === first);
  if (!hit) return { picked: "none", probabilities: { none: 0.95 } };
  return { picked: hit.id, probabilities: { [hit.id]: unsure ? 0.6 : 0.95, none: unsure ? 0.4 : 0.05 } };
};
