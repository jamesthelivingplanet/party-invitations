import { expect, test, type Page } from "@playwright/test";
import { loginAsHost, replyOnSharedLink } from "./helpers";

const phone = { width: 390, height: 844 };
const desktop = { width: 1280, height: 900 };

async function scrollsSideways(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
}

test("the Shared link page fits the screen and keeps its form reachable at phone and desktop width", async ({ page }) => {
  for (const size of [phone, desktop]) {
    await page.setViewportSize(size);
    await page.goto("/?lang=en");

    expect(await scrollsSideways(page), `sideways scroll at ${size.width}px`).toBe(false);
    await page.getByRole("button", { name: /send/i }).scrollIntoViewIfNeeded();
    await expect(page.getByRole("button", { name: /send/i })).toBeInViewport();
  }
});

test("the admin dashboard fits the screen at phone and desktop width, and lays review cards out to suit", async ({ page }) => {
  await replyOnSharedLink(page, { name: "Stranger", relation: "layout-case-one", coming: true });
  await replyOnSharedLink(page, { name: "Stranger", relation: "layout-case-two", coming: true });
  await loginAsHost(page);

  const firstX = async () => (await page.locator("ul.grid > li", { hasText: "layout-case-one" }).boundingBox())!.x;
  const secondX = async () => (await page.locator("ul.grid > li", { hasText: "layout-case-two" }).boundingBox())!.x;

  await page.setViewportSize(phone);
  expect(await scrollsSideways(page), "sideways scroll at phone width").toBe(false);
  expect(await firstX()).toBe(await secondX()); // stacked in one column

  await page.setViewportSize(desktop);
  expect(await scrollsSideways(page), "sideways scroll at desktop width").toBe(false);
  expect(await firstX()).not.toBe(await secondX()); // side by side
  await expect(page.locator("section[aria-label=Summary]")).toBeInViewport();
});
