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
  await expect(page.getByText("You're all set")).toBeVisible();

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
  await expect(page.getByText("Todo listo")).toBeVisible();

  await page.goto(path);
  await page.getByRole("link", { name: /English/ }).click();
  await expect(page.getByRole("heading", { name: "Hi Pedro Personal!" })).toBeVisible();
});

test("an unknown or malformed Personal link shows a friendly message", async ({ page }) => {
  await page.goto("/i/this-is-not-a-real-code?lang=en");
  await expect(page.getByRole("heading", { name: "We can't find this invitation" })).toBeVisible();
  await expect(page.getByRole("button", { name: /send/i })).toHaveCount(0);
});

test("regenerating a link retires the old one, and archiving shows 'no longer available' until restored", async ({ page }) => {
  const oldPath = await addGuest(page, "Rita Regenerate", "es");
  await page.goto(oldPath);
  await page.getByRole("button", { name: "¡Sí!" }).click();
  await page.getByRole("button", { name: "Enviar respuesta" }).click();
  await expect(page.getByText("Todo listo")).toBeVisible();

  await page.goto("/admin/guests");
  const row = () => page.locator("li", { hasText: "Rita Regenerate" }).first();
  await row().getByRole("button", { name: "Regenerate link" }).click();
  await expect(row().locator("[data-personal-path]")).not.toHaveAttribute("data-personal-path", oldPath);
  const newPath = (await row().locator("[data-personal-path]").getAttribute("data-personal-path"))!;

  await page.goto(`${oldPath}?lang=en`);
  await expect(page.getByRole("heading", { name: "We can't find this invitation" })).toBeVisible();
  await page.goto("/admin");
  await expect(page.locator("li", { hasText: "Rita Regenerate" }).first()).toBeVisible(); // reply kept

  await page.goto("/admin/guests");
  await row().getByRole("button", { name: "Archive" }).click();
  await page.goto(newPath);
  await expect(page.getByRole("heading", { name: "Esta invitación ya no está disponible" })).toBeVisible();
  await expect(page.getByRole("button", { name: /enviar/i })).toHaveCount(0);

  await page.goto("/admin/guests");
  await page.getByText(/Archived guests/).click();
  await page.locator("li", { hasText: "Rita Regenerate" }).getByRole("button", { name: "Restore" }).click();
  await page.goto(newPath);
  await expect(page.getByRole("heading", { name: "¡Hola Rita Regenerate!" })).toBeVisible();
});

test("a Guest reopens their link, sees their answer, and changes it", async ({ page }) => {
  const path = await addGuest(page, "Carla Changer", "en");
  await page.goto(path);
  await page.getByRole("button", { name: "Yes!" }).click();
  await page.fill("input[name=partySize]", "4");
  await fillCompanions(page, 3);
  await page.getByRole("button", { name: "Send reply" }).click();
  await expect(page.getByText("You're all set")).toBeVisible();

  await page.goto(path);
  await expect(page.getByRole("heading", { name: "You're all set" })).toBeVisible();
  await page.getByRole("button", { name: "Change my reply" }).click();
  await expect(page.locator("input[name=partySize]")).toHaveValue("4");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  await expect(page.locator("input[name=companion-name-2]")).toHaveValue("Companion 3");
  await page.fill("input[name=partySize]", "2");
  await expect(page.locator("input[name=companion-name-1]")).toHaveCount(0);
  await expect(page.locator("input[name=companion-name-0]")).toHaveValue("Companion 1");
  await page.getByRole("button", { name: "Send reply" }).click();
  await expect(page.getByText("You're all set")).toBeVisible();

  await page.goto("/admin");
  await expect(page.locator("li", { hasText: "Carla Changer" }).filter({ hasText: "2 people" })).toHaveCount(1);

  await page.goto(path);
  await page.getByRole("button", { name: "Change my reply" }).click();
  await page.getByRole("button", { name: "Can't make it" }).click();
  await page.getByRole("button", { name: "Send reply" }).click();
  await expect(page.getByTestId("reply-answer")).toHaveText("Not coming");
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
  await expect(page.getByText("You're all set")).toBeVisible();

  await page.goto("/admin");
  const row = page.locator("li", { hasText: "Fiona Family" }).filter({ hasText: "3 people" });
  await expect(row.getByText("Tim Tiny · child")).toBeVisible();
  await expect(row.getByText("Ada Adult · adult")).toBeVisible();

  await page.goto(path);
  await page.getByRole("button", { name: "Change my reply" }).click();
  await page.getByRole("button", { name: "Can't make it" }).click();
  await expect(page.locator("input[name=partySize]")).toHaveCount(0);
  await expect(page.locator("input[name=companion-name-0]")).toHaveCount(0);
});

test("Not [name]? records the Reply for the Guest the person is, and leaves the link owner's Reply alone", async ({ page }) => {
  const path = await addGuest(page, "Nora Owner", "en");
  await page.goto(path);
  await page.getByRole("button", { name: "Yes!" }).click();
  await page.getByRole("button", { name: "Send reply" }).click();
  await expect(page.getByText("You're all set")).toBeVisible();

  // Someone else opens the forwarded link and says who they are. The page never names the Guest they matched.
  await page.goto(path);
  await page.getByRole("button", { name: "Not Nora Owner?" }).click();
  await page.fill("input[name=name]", "Emma");
  await page.fill("input[name=relation]", "forwarded-case");
  await page.getByRole("button", { name: "Can't make it" }).click();
  await page.getByRole("button", { name: /send/i }).click();
  await expect(page.getByText("Thanks for letting us know!")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Emma Rodriguez");

  await page.goto("/admin");
  await expect(page.locator("li", { hasText: "Nora Owner" }).filter({ hasText: "Coming" }).first()).toBeVisible();
  await page.goto(path);
  await expect(page.getByTestId("reply-answer")).toHaveText("Coming: 1 person");
});

test("Not [name]? with nobody matched leaves a Request marked as a forwarded Personal link, in Spanish", async ({ page }) => {
  const path = await addGuest(page, "Sol Dueño", "es");
  await page.goto(path);
  await page.getByRole("button", { name: "¿No eres Sol Dueño?" }).click();
  await page.fill("input[name=name]", "Desconocido");
  await page.fill("input[name=relation]", "forward-es-case");
  await page.getByRole("button", { name: "🛑 No puedo ir" }).click();
  await page.getByRole("button", { name: /enviar/i }).click();
  await expect(page.getByRole("heading", { name: "Nos encantaría tenerte en la fiesta" })).toBeVisible();
  await page.fill("input[name=email]", "d@example.com");
  await page.getByRole("button", { name: "Enviar mis datos" }).click();
  await expect(page.getByText("Tenemos tus datos y te contactaremos pronto.")).toBeVisible();

  await page.goto("/admin/requests");
  await expect(page.locator("li", { hasText: "forward-es-case" })).toContainText("Personal link");
});

test("reply, see the summary, change it, see the new summary (phone width)", async ({ page }) => {
  const path = await addGuest(page, "Sara Summary", "en");
  await page.goto(path);
  await expect(page.getByRole("button", { name: "Change my reply" })).toHaveCount(0); // not replied yet: the form

  await page.getByRole("button", { name: "Yes!" }).click();
  await page.fill("input[name=partySize]", "3");
  await page.fill("input[name=companion-name-0]", "Tim Tiny");
  await page.selectOption("select[name=companion-kind-0]", "child");
  await page.fill("input[name=companion-name-1]", "Ada Adult");
  await page.selectOption("select[name=companion-kind-1]", "adult");
  await page.getByRole("button", { name: "Send reply" }).click();

  await expect(page.getByRole("heading", { name: "You're all set" })).toBeVisible();
  await expect(page.getByText("Thanks! Your reply is in.")).toBeVisible();
  await expect(page.getByTestId("reply-answer")).toHaveText("Coming: 3 people");
  await expect(page.getByTestId("reply-party-size")).toHaveText("3");
  await expect(page.getByTestId("reply-companions")).toContainText("Tim Tiny (Child)");
  await expect(page.getByTestId("reply-companions")).toContainText("Ada Adult (Adult)");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);

  // Coming back later: the summary, without the thank-you line.
  await page.goto(path);
  await expect(page.getByRole("heading", { name: "You're all set" })).toBeVisible();
  await expect(page.getByText("Thanks! Your reply is in.")).toHaveCount(0);

  await page.getByRole("button", { name: "Change my reply" }).click();
  await expect(page.locator("input[name=companion-name-0]")).toHaveValue("Tim Tiny");
  await page.fill("input[name=partySize]", "2");
  await page.getByRole("button", { name: "Send reply" }).click();
  await expect(page.getByTestId("reply-answer")).toHaveText("Coming: 2 people");
  await expect(page.getByTestId("reply-companions")).toContainText("Tim Tiny (Child)");
  await expect(page.getByTestId("reply-companions")).not.toContainText("Ada Adult");
});

test("the Party size box can be cleared and retyped; it falls back to 1 when left empty", async ({ page }) => {
  const path = await addGuest(page, "Pablo Party", "en");
  await page.goto(path);
  await page.getByRole("button", { name: "Yes!" }).click();
  const box = page.locator("input[name=partySize]");
  await page.fill("input[name=partySize]", "3");
  await expect(page.locator("input[name=companion-name-1]")).toBeVisible();

  await box.fill("");
  await expect(box).toHaveValue(""); // not forced back to a number while typing
  await expect(page.locator("input[name=companion-name-1]")).toBeVisible(); // rows unchanged until blur
  await box.pressSequentially("2");
  await expect(box).toHaveValue("2");
  await expect(page.locator("input[name=companion-name-1]")).toHaveCount(0);
  await expect(page.locator("input[name=companion-name-0]")).toBeVisible();

  await box.fill("");
  await box.blur();
  await expect(box).toHaveValue("1");
  await expect(page.locator("input[name=companion-name-0]")).toHaveCount(0);

  await box.fill("99");
  await box.blur();
  await expect(box).toHaveValue("10");
});
