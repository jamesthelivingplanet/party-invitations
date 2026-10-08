import { expect, test } from "@playwright/test";
import { dashboardNumbers, fillCompanions, loginAsHost } from "./helpers";

/** Adds a Guest through the admin and returns the path of their Personal link. */
async function addGuest(page: import("@playwright/test").Page, name: string, language: "en" | "es") {
  await loginAsHost(page);
  await page.goto("/admin/guests");
  await page.fill("#new-name", name);
  await page.selectOption("#new-language", language);
  await page.getByRole("button", { name: "Add guest" }).click();
  const row = page.locator("li", { hasText: name }).first();
  const path = await row.locator("[data-personal-path]").getAttribute("data-personal-path");
  expect(path).toMatch(/^\/i\/[A-Za-z0-9_-]{22,}$/);
  return path!;
}

test("a Guest opens their Personal link in English, replies, and the Host sees it as theirs", async ({ page }) => {
  const path = await addGuest(page, "Penny Personal", "en");
  await page.goto(path);

  await expect(page.getByRole("heading", { name: "Hi Penny Personal!" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  await page.getByRole("button", { name: "Yes!" }).click();
  await page.fill("input[name=partySize]", "3");
  await fillCompanions(page, 2);
  await page.getByRole("button", { name: "Send reply" }).click();
  await expect(page.getByText("You're on the starting grid!")).toBeVisible();

  await page.goto("/admin");
  await expect(page.locator("li", { hasText: "Penny Personal" }).filter({ hasText: "3 people" })).toBeVisible();
  expect((await dashboardNumbers(page)).headcount).toBeGreaterThanOrEqual(3);
});

test("a Spanish-speaking Guest sees Spanish first and can switch to English", async ({ page }) => {
  const path = await addGuest(page, "Pedro Personal", "es");
  await page.goto(path);

  await expect(page.getByRole("heading", { name: "¡Hola Pedro Personal!" })).toBeVisible();
  await page.getByRole("button", { name: "¡Sí!" }).click();
  await page.getByRole("button", { name: "Enviar respuesta" }).click();
  await expect(page.getByText("¡Ya estás en la parrilla de salida!")).toBeVisible();

  await page.goto(path);
  await page.getByRole("link", { name: /English/ }).click();
  await expect(page.getByRole("heading", { name: "Hi Pedro Personal!" })).toBeVisible();
});

test("an unknown or malformed Personal link shows a friendly message", async ({ page }) => {
  await page.goto("/i/this-is-not-a-real-code?lang=en");
  await expect(page.getByRole("heading", { name: "We can't find this invitation" })).toBeVisible();
  await expect(page.getByRole("button", { name: /send/i })).toHaveCount(0);
});

test("a Guest reopens their link, sees their answer, and changes it", async ({ page }) => {
  const path = await addGuest(page, "Carla Changer", "en");
  await page.goto(path);
  await page.getByRole("button", { name: "Yes!" }).click();
  await page.fill("input[name=partySize]", "4");
  await fillCompanions(page, 3);
  await page.getByRole("button", { name: "Send reply" }).click();
  await expect(page.getByText("You're on the starting grid!")).toBeVisible();

  await page.goto(path);
  await expect(page.locator("input[name=partySize]")).toHaveValue("4");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  await expect(page.locator("input[name=companion-name-2]")).toHaveValue("Companion 3");
  await page.fill("input[name=partySize]", "2");
  await expect(page.locator("input[name=companion-name-1]")).toHaveCount(0);
  await expect(page.locator("input[name=companion-name-0]")).toHaveValue("Companion 1");
  await page.getByRole("button", { name: "Send reply" }).click();
  await expect(page.getByText("You're on the starting grid!")).toBeVisible();

  await page.goto("/admin");
  await expect(page.locator("li", { hasText: "Carla Changer" }).filter({ hasText: "2 people" })).toHaveCount(1);

  await page.goto(path);
  await page.getByRole("button", { name: "Can't make it" }).click();
  await page.getByRole("button", { name: "Send reply" }).click();
  await page.goto("/admin");
  await expect(page.locator("li", { hasText: "Carla Changer" }).filter({ hasText: "people" })).toHaveCount(0);
});

test("Companions are named and labelled, shown to the Host, and hidden when not coming", async ({ page }) => {
  const path = await addGuest(page, "Fiona Family", "en");
  await page.goto(path);
  await page.getByRole("button", { name: "Yes!" }).click();
  await expect(page.locator("input[name=companion-name-0]")).toHaveCount(0);
  await page.fill("input[name=partySize]", "3");
  await expect(page.locator("input[name=companion-name-1]")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  await page.fill("input[name=companion-name-0]", "Tim Tiny");
  await page.selectOption("select[name=companion-kind-0]", "child");
  await page.fill("input[name=companion-name-1]", "Ada Adult");
  await page.selectOption("select[name=companion-kind-1]", "adult");
  await page.getByRole("button", { name: "Send reply" }).click();
  await expect(page.getByText("You're on the starting grid!")).toBeVisible();

  await page.goto("/admin");
  const row = page.locator("li", { hasText: "Fiona Family" }).filter({ hasText: "3 people" });
  await expect(row.getByText("Tim Tiny · child")).toBeVisible();
  await expect(row.getByText("Ada Adult · adult")).toBeVisible();

  await page.goto(path);
  await page.getByRole("button", { name: "Can't make it" }).click();
  await expect(page.locator("input[name=partySize]")).toHaveCount(0);
  await expect(page.locator("input[name=companion-name-0]")).toHaveCount(0);
});
