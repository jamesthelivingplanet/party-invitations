import { expect, test } from "@playwright/test";
import { loginAsHost, replyOnSharedLink } from "./helpers";

const PLACE = "Secret Venue 123";

test.describe.configure({ mode: "serial" });

test("the Shared link hides the place until the Guest list recognises someone who is coming", async ({ page, request }) => {
  await loginAsHost(page);
  await page.goto("/admin/settings");
  await page.fill("input[name=place]", PLACE);
  await page.fill("input[name=mapUrl]", "https://maps.example/secret");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  // A stranger on the Shared link sees no place, no map link, and the calendar file leaves it out.
  await page.context().clearCookies();
  await page.goto("/?lang=en");
  await expect(page.locator("body")).not.toContainText(PLACE);
  await expect(page.getByText("Shown after you reply")).toBeVisible();
  const html = await page.content();
  expect(html).not.toContain("maps.example");
  expect(html).not.toContain("Secret");
  const publicIcs = await (await request.get("/api/calendar")).text();
  expect(publicIcs).not.toContain("Secret");
  expect(publicIcs).not.toContain("maps.example");

  // An unsure Match learns nothing either.
  await replyOnSharedLink(page, { name: "Maybe Michael", relation: "privacy-unsure", coming: true, partySize: 1 });
  await expect(page.getByText("We got your reply!")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(PLACE);

  // A recognised Guest who is coming gets the place, the map link and calendar buttons.
  await replyOnSharedLink(page, { name: "Emma", relation: "neighbor", coming: true, partySize: 1 });
  await expect(page.getByText("You're confirmed!")).toBeVisible();
  await expect(page.getByRole("link", { name: /Secret Venue 123/ })).toHaveAttribute("href", "https://maps.example/secret");
  await expect(page.locator("a[href*=\"location=Secret\"]")).toBeVisible();
});

test("a recognised Guest who can't come is not told the place", async ({ page }) => {
  await replyOnSharedLink(page, { name: "Liam", relation: "soccer teammate", coming: false });
  await expect(page.getByText("Thanks for letting us know!")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(PLACE);
});
