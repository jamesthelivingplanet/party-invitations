import { expect, test } from "vitest";
import { createLoginHandler } from "./admin-login";
import { SESSION_COOKIE, verifySessionToken } from "./admin-session";

const NOW = Date.UTC(2026, 9, 5);

function loginRequest(password: string, url = "https://party.example/admin/login") {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ password }),
  });
}

test("a wrong password goes back to the login page and sets no cookie", async () => {
  const login = createLoginHandler({ password: "vroom-vroom", now: () => NOW });

  const response = await login(loginRequest("nope"));

  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe("https://party.example/admin/login?error=1");
  expect(response.headers.get("set-cookie")).toBeNull();
});

test("the right password sends you to the admin with a session cookie that proves you logged in", async () => {
  const login = createLoginHandler({ password: "vroom-vroom", now: () => NOW });

  const response = await login(loginRequest("vroom-vroom"));

  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe("https://party.example/admin");
  const cookie = response.headers.get("set-cookie") ?? "";
  expect(cookie).toContain("HttpOnly");
  expect(cookie).toContain("SameSite=Lax");
  expect(cookie).toContain("Secure");
  expect(cookie).toContain("Path=/");
  expect(cookie).toContain("Max-Age=2592000");
  const token = new RegExp(`${SESSION_COOKIE}=([^;]+)`).exec(cookie)?.[1];
  expect(verifySessionToken(token, "vroom-vroom", NOW)).toBe(true);
});

test("over plain http (local development) the cookie is not marked Secure", async () => {
  const login = createLoginHandler({ password: "vroom-vroom", now: () => NOW });

  const response = await login(loginRequest("vroom-vroom", "http://localhost:3000/admin/login"));

  expect(response.headers.get("set-cookie")).not.toContain("Secure");
});

test("no one can log in when no admin password is configured", async () => {
  const login = createLoginHandler({ password: "", now: () => NOW });

  const response = await login(loginRequest(""));

  expect(response.headers.get("location")).toContain("/admin/login?error=1");
  expect(response.headers.get("set-cookie")).toBeNull();
});
