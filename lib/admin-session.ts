import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "admin_session";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export function passwordMatches(input: string, expected: string): boolean {
  if (!expected) return false;
  return safeEqual(input, expected);
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/** A signed token that says "this browser logged in", valid for 30 days from `now` (ms). */
export function createSessionToken(secret: string, now: number): string {
  const expiresAt = String(now + SESSION_MAX_AGE_SECONDS * 1000);
  return `${expiresAt}.${sign(expiresAt, secret)}`;
}

export function verifySessionToken(token: string | undefined, secret: string, now: number): boolean {
  if (!token || !secret) return false;
  const [expiresAt, signature] = token.split(".");
  if (!expiresAt || !signature) return false;
  return safeEqual(signature, sign(expiresAt, secret)) && Number(expiresAt) > now;
}
