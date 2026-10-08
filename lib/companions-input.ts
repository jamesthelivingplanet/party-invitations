import type { Companion } from "./replies";

/** Companions from a request body, untrusted: the Replies module checks names and labels. */
export function readCompanions(body: unknown): Companion[] {
  const list = (body as { companions?: unknown } | null)?.companions;
  if (!Array.isArray(list)) return [];
  return list.map((c) => ({ name: String(c?.name ?? ""), kind: c?.kind }));
}
