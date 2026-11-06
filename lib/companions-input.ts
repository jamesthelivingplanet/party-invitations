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
