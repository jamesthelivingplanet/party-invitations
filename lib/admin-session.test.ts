import { expect, test } from "vitest";
import { createSessionToken, passwordMatches, verifySessionToken } from "./admin-session";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 5);

test("only the exact admin password is accepted", () => {
  expect(passwordMatches("vroom-vroom", "vroom-vroom")).toBe(true);
  expect(passwordMatches("vroom-vroom ", "vroom-vroom")).toBe(false);
  expect(passwordMatches("VROOM-VROOM", "vroom-vroom")).toBe(false);
  expect(passwordMatches("", "vroom-vroom")).toBe(false);
});

test("no password is accepted when none is configured", () => {
  expect(passwordMatches("", "")).toBe(false);
  expect(passwordMatches("anything", "")).toBe(false);
});

test("a session token that was just issued is valid", () => {
  const token = createSessionToken("secret", NOW);

  expect(verifySessionToken(token, "secret", NOW)).toBe(true);
  expect(verifySessionToken(token, "secret", NOW + 29 * DAY_MS)).toBe(true);
});

test("a token that was tampered with is rejected", () => {
  const token = createSessionToken("secret", NOW);
  const [expiresAt, signature] = token.split(".");
  const extended = `${Number(expiresAt) + 365 * DAY_MS}.${signature}`; // keep the old signature

  expect(verifySessionToken(extended, "secret", NOW)).toBe(false);
  expect(verifySessionToken(`${expiresAt}.${"0".repeat(signature.length)}`, "secret", NOW)).toBe(false);
});

test("a token made with a different secret is rejected", () => {
  const token = createSessionToken("old-password", NOW);

  expect(verifySessionToken(token, "new-password", NOW)).toBe(false);
});

test("an expired token is rejected", () => {
  const token = createSessionToken("secret", NOW);

  expect(verifySessionToken(token, "secret", NOW + 30 * DAY_MS + 1)).toBe(false);
});

test("missing or garbage tokens are rejected", () => {
  for (const bad of [undefined, "", "garbage", "123.", ".abc", "a.b.c"]) {
    expect(verifySessionToken(bad, "secret", NOW)).toBe(false);
  }
});
