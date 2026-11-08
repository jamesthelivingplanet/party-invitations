import { clampPartySize } from "./party";
import type { Child, Companion } from "./replies";

/** Companions from a request body, untrusted: the Replies module checks names and labels. */
export function readCompanions(body: unknown): Companion[] {
  const list = (body as { companions?: unknown } | null)?.companions;
  if (!Array.isArray(list)) return [];
  return list.map((c) => ({ name: String(c?.name ?? ""), kind: c?.kind }));
}

/** A household's children from a request body, untrusted (the Replies module checks them): null when not answered. */
export function readChildren(body: unknown): Child[] | null {
  const list = (body as { children?: unknown } | null)?.children;
  if (!Array.isArray(list)) return null;
  return list.map((c) => ({ name: String(c?.name ?? ""), kind: c?.kind }));
}

/** Reads Party size and Companions back out of a form that used CompanionFields. */
export function readParty(form: FormData): { partySize: number; companions: Companion[] } {
  const partySize = clampPartySize(form.get("partySize"));
  const companions = Array.from({ length: partySize - 1 }, (_, i) => ({
    name: String(form.get(`companion-name-${i}`) ?? ""),
    kind: String(form.get(`companion-kind-${i}`) ?? "") as Companion["kind"],
  }));
  return { partySize, companions };
}
