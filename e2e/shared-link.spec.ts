import { expect, test } from "@playwright/test";
import { dashboardNumbers, loginAsHost, replyOnSharedLink } from "./helpers";

test("a Guest Jev is sure about gets a thank-you and counts as coming", async ({ page }) => {
  await loginAsHost(page);
  const before = await dashboardNumbers(page);

  await replyOnSharedLink(page, { name: "Emma", relation: "neighbor", coming: true, partySize: 3 });
  await expect(page.getByText("You're confirmed!")).toBeVisible();

  await page.goto("/admin");
  const after = await dashboardNumbers(page);
  expect(after.review).toBe(before.review);
  // Shown under Coming by their list name, with their party size.
  await expect(page.locator("li", { hasText: "Emma Rodriguez" }).filter({ hasText: "3 people" })).toBeVisible();
});

test("a Guest who says they can't come is counted as declined", async ({ page }) => {
  await loginAsHost(page);
  const before = await dashboardNumbers(page); // other specs share this database

  await replyOnSharedLink(page, { name: "Liam", relation: "soccer teammate", coming: false });
  await expect(page.getByText("Thanks for letting us know!")).toBeVisible();

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: /Declined/ })).toBeVisible();
  expect((await dashboardNumbers(page)).declined).toBe(before.declined + 1);
});

test("an unsure Match is thanked generically and waits for review with a suggestion", async ({ page }) => {
  await replyOnSharedLink(page, { name: "Maybe Michael", relation: "unsure-match-case", coming: true, partySize: 2 });

  // The page never says who Jev thought the person was.
  await expect(page.getByText("We got your reply!")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Michael Johnson");

  await loginAsHost(page);
  const card = page.locator("li", { hasText: "unsure-match-case" });
  await expect(card).toContainText("Possibly Michael Johnson");
  await expect(card).toContainText("Says coming");
});

test("someone nobody recognizes is asked for their details and becomes a Request, not counted", async ({ page }) => {
  await loginAsHost(page);
  const before = await dashboardNumbers(page);

  await replyOnSharedLink(page, { name: "Stranger", relation: "stranger-case", coming: true, partySize: 2 });
  await expect(page.getByText("We'd love to have you at the party")).toBeVisible();
  await expect(page.getByText("Leave your details here so we can get back to you.")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Emma");

  // No way to reach them: refused with a clear message.
  await page.getByRole("button", { name: "Send my details" }).click();
  await expect(page.getByText(/at least one way to reach you/)).toBeVisible();

  await page.fill("input[name=phone]", "555-0142");
  await page.getByRole("button", { name: "Send my details" }).click();
  await expect(page.getByText("We have your details and will get back to you soon.")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("starting grid");

  await page.goto("/admin/requests");
  const card = page.locator("li", { hasText: "stranger-case" });
  await expect(card).toContainText("Stranger");
  await expect(card).toContainText("Says coming");
  await expect(card).toContainText("Companion 1");
  await expect(card).toContainText("Shared link");
  await expect(card).toContainText("555-0142");

  await page.goto("/admin");
  expect(await dashboardNumbers(page)).toEqual(before);
  await expect(page.getByRole("link", { name: /requests? from people not on the list/ })).toBeVisible();
});

test("the Request form needs a name, and shows in Spanish", async ({ page }) => {
  await page.goto("/?lang=es");
  await page.fill("input[name=name]", "Extraño");
  await page.fill("input[name=relation]", "request-es-case");
  await page.getByRole("button", { name: "🛑 No puedo ir" }).click();
  await page.getByRole("button", { name: /enviar/i }).click();

  await expect(page.getByText("Nos encantaría tenerte en la fiesta")).toBeVisible();
  await page.fill("input[name=name]", "");
  await page.fill("input[name=email]", "extrano@example.com");
  await page.getByRole("button", { name: "Enviar mis datos" }).click();
  await expect(page.getByText("Por favor escribe tu nombre.")).toBeVisible();

  await page.fill("input[name=name]", "Extraño");
  await page.getByRole("button", { name: "Enviar mis datos" }).click();
  await expect(page.getByText("Tenemos tus datos y te contactaremos pronto.")).toBeVisible();

  await loginAsHost(page);
  await page.goto("/admin/requests");
  await expect(page.locator("li", { hasText: "request-es-case" })).toContainText("Says not coming");
});

test("the Shared link form needs a name and a relation before sending", async ({ page }) => {
  await page.goto("/?lang=en");
  await page.getByRole("button", { name: "Yes!" }).click();
  await page.getByRole("button", { name: /send/i }).click();

  await expect(page.getByText("You're on the starting grid!")).toHaveCount(0);
  await expect(page.locator("input[name=name]:invalid")).toHaveCount(1);
});

test("the Shared link shows in Spanish when asked", async ({ page }) => {
  await page.goto("/?lang=es");
  await expect(page.getByRole("button", { name: "¡Sí!" })).toBeVisible();
});
