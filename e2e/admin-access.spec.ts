import { expect, test } from "@playwright/test";
import { loginAsHost } from "./helpers";

test("the dashboard asks for the password before showing anything", async ({ page }) => {
  await page.goto("/admin");

  await expect(page.locator("input[name=password]")).toBeVisible();
  await expect(page.locator("section[aria-label=Summary]")).toHaveCount(0);
});

test("a wrong password does not let the Host in", async ({ page }) => {
  await page.goto("/admin");
  await page.fill("input[name=password]", "not-the-password");
  await page.press("input[name=password]", "Enter");

  await expect(page.locator("input[name=password]")).toBeVisible();
  await expect(page.locator("section[aria-label=Summary]")).toHaveCount(0);
});

test("the right password opens the dashboard", async ({ page }) => {
  await loginAsHost(page);

  await expect(page.locator("section[aria-label=Summary]")).toBeVisible();
});
