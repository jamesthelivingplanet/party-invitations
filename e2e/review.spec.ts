import { expect, test, type Page } from "@playwright/test";
import { dashboardNumbers, loginAsHost, replyOnSharedLink } from "./helpers";

/** A reply that Jev can't place, with a unique phrase so each test finds its own card. */
async function strangerReply(page: Page, marker: string, partySize = 2) {
  await replyOnSharedLink(page, { name: "Stranger", relation: marker, coming: true, partySize });
  await loginAsHost(page);
  return page.locator("li", { hasText: marker });
}

test("the Host confirms an unsure Match with a second tap, and can undo it", async ({ page }) => {
  await replyOnSharedLink(page, { name: "Maybe Grandma", relation: "confirm-case", coming: true, partySize: 2 });
  await loginAsHost(page);
  const before = await dashboardNumbers(page);

  await page.locator("li", { hasText: "confirm-case" }).getByRole("button", { name: "Confirm as Grandma Example" }).click();
  // Nothing happens until the second step.
  await expect(page.getByText("Confirm this reply as Grandma Example?")).toBeVisible();
  expect((await dashboardNumbers(page)).review).toBe(before.review);
  await page.getByRole("button", { name: "Yes, confirm" }).click();

  await expect(page.locator("li", { hasText: "Grandma Example" }).getByText("Confirmed by you")).toBeVisible();
  const confirmed = await dashboardNumbers(page);
  expect(confirmed.review).toBe(before.review - 1);
  expect(confirmed.headcount).toBe(before.headcount + 2);
  expect(confirmed.notReplied).toBe(before.notReplied - 1);

  await page.locator("li", { hasText: "Grandma Example" }).getByRole("button", { name: "Undo" }).click();
  await expect(page.locator("li", { hasText: "confirm-case" })).toContainText("Possibly Grandma Example");
  expect(await dashboardNumbers(page)).toEqual(before);
});

test("the Host can assign a reply to a different Guest", async ({ page }) => {
  const card = await strangerReply(page, "assign-case", 4);
  const before = await dashboardNumbers(page);

  await card.locator("summary").click();
  await card.locator("select").selectOption({ label: "Uncle Dave" });
  await card.getByRole("button", { name: "Assign to this guest" }).click();
  await page.getByRole("button", { name: "Yes, confirm" }).click();

  await expect(page.locator("li", { hasText: "Uncle Dave" }).getByText("Confirmed by you")).toBeVisible();
  expect((await dashboardNumbers(page)).headcount).toBe(before.headcount + 4);
});

test("declining at the second step leaves the reply in review", async ({ page }) => {
  const card = await strangerReply(page, "cancel-case");
  const before = await dashboardNumbers(page);

  await card.getByRole("button", { name: "Not invited" }).click();
  await expect(page.getByText("Mark this reply as not invited?")).toBeVisible();
  await page.getByRole("button", { name: /cancel|no/i }).first().click();

  await expect(page.locator("li", { hasText: "cancel-case" })).toBeVisible();
  expect(await dashboardNumbers(page)).toEqual(before);
});

test("marking a reply not invited sets it aside, and Bring back returns it", async ({ page }) => {
  const card = await strangerReply(page, "dismiss-case");
  const before = await dashboardNumbers(page);

  await card.getByRole("button", { name: "Not invited" }).click();
  await page.getByRole("button", { name: /^Yes/ }).click();

  await expect(page.getByText(/Dismissed replies/)).toBeVisible();
  expect((await dashboardNumbers(page)).review).toBe(before.review - 1);

  await page.getByText(/Dismissed replies/).click();
  await page.getByRole("button", { name: "Bring back" }).first().click();
  await expect(page.locator("ul.grid > li", { hasText: "dismiss-case" })).toBeVisible();
  expect(await dashboardNumbers(page)).toEqual(before);
});

test("the Host can add a reply as a new Guest and it counts in the headcount", async ({ page }) => {
  const card = await strangerReply(page, "new-guest-case", 3);
  const before = await dashboardNumbers(page);

  await card.locator("summary").click();
  await card.locator("input[name=new_name]").fill("Pat Newcomer");
  await card.getByRole("button", { name: "Add as new guest" }).click();
  await page.getByRole("button", { name: "Yes, confirm" }).click();

  await expect(page.locator("li", { hasText: "Pat Newcomer" }).getByText("Added by you")).toBeVisible();
  expect((await dashboardNumbers(page)).headcount).toBe(before.headcount + 3);
});
