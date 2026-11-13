import { expect, test, type Page } from "@playwright/test";
import { dashboardNumbers, loginAsHost, replyOnSharedLink } from "./helpers";

/** Someone Jev can't place leaves their details on the Shared link, which makes a Request. */
async function makeRequest(page: Page, marker: string, name: string, partySize = 2) {
  await replyOnSharedLink(page, { name, relation: marker, coming: true, partySize });
  await page.fill("input[name=phone]", "555-0199");
  await page.getByRole("button", { name: "Send my details" }).click();
  await expect(page.getByText("We have your details and will get back to you soon.")).toBeVisible();
  await loginAsHost(page);
  await page.goto("/admin/requests");
  return page.locator("li", { hasText: marker });
}

test("the Host accepts a Request in Spanish: a Guest with a Personal link appears and the Reply counts", async ({ page }) => {
  const card = await makeRequest(page, "accept-req-case", "Zed Acceptable", 3);
  await page.goto("/admin");
  const before = await dashboardNumbers(page);
  await page.goto("/admin/requests");

  await card.locator("select[name=language]").selectOption("es");
  await card.getByRole("button", { name: "Add as new guest" }).click();
  // Nothing happens until the second step.
  await expect(page.getByText("Add this person as a new guest?")).toBeVisible();
  await page.getByRole("button", { name: "Yes, confirm" }).click();

  await expect(page.locator("li", { hasText: "accept-req-case" })).toHaveCount(0);

  await page.goto("/admin");
  const after = await dashboardNumbers(page);
  expect(after.headcount).toBe(before.headcount + 3);

  await page.goto("/admin/invitations");
  await expect(page.locator("li[data-guest='Zed Acceptable']")).toBeVisible();
  await page.goto("/admin/guests");
  const row = page.locator("li[data-guest='Zed Acceptable']");
  expect(await row.locator("[data-personal-path]").getAttribute("data-personal-path")).toMatch(/^\/i\//);
});

test("the Host declines a Request after a second tap and nothing is counted", async ({ page }) => {
  const card = await makeRequest(page, "decline-req-case", "Dee Clined");
  await page.goto("/admin");
  const before = await dashboardNumbers(page);
  await page.goto("/admin/requests");

  await card.getByRole("button", { name: "Decline request" }).click();
  await page.getByRole("button", { name: /^Cancel/ }).click();
  await expect(page.locator("li", { hasText: "decline-req-case" })).toBeVisible();

  await card.getByRole("button", { name: "Decline request" }).click();
  await page.getByRole("button", { name: "Yes, confirm" }).click();
  await expect(page.locator("li", { hasText: "decline-req-case" })).toHaveCount(0);

  await page.goto("/admin");
  expect(await dashboardNumbers(page)).toEqual(before);
  await page.goto("/admin/invitations");
  await expect(page.getByText("Dee Clined")).toHaveCount(0);
});

test("a weak Match is not sent to review: the stranger leaves details, the Host sees the guess and gives the Request to that Guest", async ({ page }) => {
  await loginAsHost(page);
  const before = await dashboardNumbers(page);

  await replyOnSharedLink(page, { name: "Weak Michael", relation: "weak-guess-case", coming: true, partySize: 2 });
  await expect(page.getByText("We couldn't find your name on our list")).toBeVisible();
  await expect(page.getByText("We got your reply!")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("Michael Johnson");
  await page.fill("input[name=phone]", "555-0135");
  await page.getByRole("button", { name: "Send my details" }).click();
  await expect(page.getByText("We have your details and will get back to you soon.")).toBeVisible();

  await page.goto("/admin");
  expect((await dashboardNumbers(page)).review).toBe(before.review);

  await page.goto("/admin/requests");
  const card = page.locator("li", { hasText: "weak-guess-case" });
  await expect(card).toContainText("Possibly Michael Johnson, 35%");

  await card.getByRole("button", { name: "This is an existing Guest" }).click();
  await expect(page.getByText("Give this reply to the chosen guest?")).toBeVisible();
  await page.getByRole("button", { name: /^Cancel/ }).click();
  await expect(card).toBeVisible();

  await card.getByRole("button", { name: "This is an existing Guest" }).click();
  await page.getByRole("button", { name: "Yes, confirm" }).click();
  await expect(page.locator("li", { hasText: "weak-guess-case" })).toHaveCount(0);

  await page.goto("/admin");
  const after = await dashboardNumbers(page);
  expect(after.headcount).toBe(before.headcount + 2);
  await expect(page.locator("li", { hasText: "Michael Johnson" }).filter({ hasText: "2 people" })).toBeVisible();
});

test("when Jev is unavailable the visitor leaves details and the Host sees 'Jev unavailable'", async ({ page }) => {
  await replyOnSharedLink(page, { name: "Jevdown", relation: "jev-down-case", coming: false });
  await expect(page.getByText("We couldn't find your name on our list")).toBeVisible();
  await page.fill("input[name=email]", "down@example.com");
  await page.getByRole("button", { name: "Send my details" }).click();
  await expect(page.getByText("We have your details and will get back to you soon.")).toBeVisible();

  await loginAsHost(page);
  await page.goto("/admin/requests");
  await expect(page.locator("li", { hasText: "jev-down-case" })).toContainText("Jev unavailable");
});
