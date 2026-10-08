import { expect, test, type Page } from "@playwright/test";
import { fillCompanions, loginAsHost } from "./helpers";

async function saveSettings(page: Page, s: { date: string; days: string }) {
  await page.goto("/admin/settings");
  await page.fill("#date", s.date);
  await page.fill("#days", s.days);
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByRole("status")).toContainText("Saved");
}

test("after the Reply deadline links are read-only, the Shared link says closed, and the Host can still act", async ({ page }) => {
  await loginAsHost(page);
  await page.goto("/admin/guests");
  await page.fill("#new-name", "Dana Deadline");
  await page.selectOption("#new-language", "en");
  await page.getByRole("button", { name: "Add guest" }).click();
  const path = (await page.locator("li", { hasText: "Dana Deadline" }).first().locator("[data-personal-path]").getAttribute("data-personal-path"))!;

  try {
    // Open: she replies as coming for 2.
    await saveSettings(page, { date: "2099-12-19", days: "7" });
    await page.goto(path);
    await expect(page.getByText("RSVP by")).toBeVisible();
    await page.getByRole("button", { name: "Yes!" }).click();
    await page.fill("input[name=partySize]", "2");
    await fillCompanions(page, 1);
    await page.getByRole("button", { name: "Send reply" }).click();
    await expect(page.getByText("You're on the starting grid!")).toBeVisible();

    // Deadline passed (event was yesterday-ish, closes on the event day itself).
    await saveSettings(page, { date: "2020-01-10", days: "0" });
    await page.goto(path);
    await expect(page.getByText("Replies are closed")).toBeVisible();
    await expect(page.getByTestId("closed-reply")).toHaveText("Coming: 2 people");
    await expect(page.getByRole("button", { name: "Send reply" })).toHaveCount(0);
    await page.goto("/?lang=es");
    await expect(page.getByText("Las respuestas están cerradas")).toBeVisible();
    await expect(page.locator("input[name=name]")).toHaveCount(0);
    await page.goto("/?lang=en");
    await expect(page.getByText("Replies are closed")).toBeVisible();

    // The Host is not restricted.
    await page.goto("/admin");
    await expect(page.locator("li", { hasText: "Dana Deadline" }).first()).toBeVisible();

  } finally {
    // Leave the shared database open for the other tests.
    await saveSettings(page, { date: "2026-12-19", days: "" });
  }
});
