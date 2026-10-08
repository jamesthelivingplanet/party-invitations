import { expect, test } from "@playwright/test";
import { dashboardNumbers, loginAsHost, replyOnSharedLink } from "./helpers";

test("a Guest Jev is sure about gets a thank-you and counts as coming", async ({ page }) => {
  await loginAsHost(page);
  const before = await dashboardNumbers(page);

  await replyOnSharedLink(page, { name: "Emma", relation: "neighbor", coming: true, partySize: 3 });
  await expect(page.getByText("You're on the starting grid!")).toBeVisible();

  await page.goto("/admin");
  const after = await dashboardNumbers(page);
  expect(after.review).toBe(before.review);
  // Shown under Coming by their list name, with their party size.
  await expect(page.locator("li", { hasText: "Emma Rodriguez" }).filter({ hasText: "3 people" })).toBeVisible();
});

test("a Guest who says they can't come is counted as declined", async ({ page }) => {
  await replyOnSharedLink(page, { name: "Liam", relation: "soccer teammate", coming: false });
  await expect(page.getByText("Thanks for letting us know!")).toBeVisible();

  await loginAsHost(page);
  await expect(page.getByRole("heading", { name: /Declined/ })).toBeVisible();
  expect((await dashboardNumbers(page)).declined).toBe(1);
});

test("an unsure Match is thanked generically and waits for review with a suggestion", async ({ page }) => {
  await replyOnSharedLink(page, { name: "Maybe Michael", relation: "unsure-match-case", coming: true, partySize: 2 });

  // The page never says who Jev thought the person was.
  await expect(page.getByText("You're on the starting grid!")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Michael Johnson");

  await loginAsHost(page);
  const card = page.locator("li", { hasText: "unsure-match-case" });
  await expect(card).toContainText("Possibly Michael Johnson");
  await expect(card).toContainText("Says coming");
});

test("someone nobody recognizes is thanked generically and lands in review as unmatched", async ({ page }) => {
  await replyOnSharedLink(page, { name: "Stranger", relation: "stranger-case", coming: true });
  await expect(page.getByText("You're on the starting grid!")).toBeVisible();

  await loginAsHost(page);
  const card = page.locator("li", { hasText: "stranger-case" });
  await expect(card).toContainText("Unmatched");
  await expect(card).toContainText("No likely match on the guest list.");
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
