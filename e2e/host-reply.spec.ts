import { expect, test } from "@playwright/test";
import { loginAsHost } from "./helpers";

test("the Host records an in-person answer from the dashboard, then undoes it", async ({ page }) => {
  await loginAsHost(page);
  const row = () => page.locator("li", { hasText: "Uncle Dave" });

  // Not replied -> Coming for 2 people, entered by the Host.
  await row().getByRole("button", { name: /Uncle Dave is coming/ }).click();
  await page.fill("input[name=partySize]", "2");
  await page.fill("input[name=companion-name-0]", "Aunt May");
  await page.selectOption("select[name=companion-kind-0]", "adult");
  await page.getByRole("button", { name: "Save as coming" }).click();
  await expect(page.getByText("Entered by you")).toBeVisible();
  await expect(row()).toContainText("2 people");

  // Undo puts them back in Not replied, where "Can't come" asks first.
  await row().getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText("Entered by you")).toHaveCount(0);
  await row().getByRole("button", { name: /Uncle Dave can't come/ }).click();
  await page.getByRole("button", { name: "Yes, can't come" }).click();
  await expect(page.getByRole("heading", { name: /Declined/ })).toBeVisible();
  await expect(row()).toContainText("Entered by you");
  await row().getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText("Entered by you")).toHaveCount(0);
});

test("Invitations offers the same buttons for a Guest who has not replied", async ({ page }) => {
  await loginAsHost(page);
  await page.goto("/admin/invitations");
  const card = page.locator("li[data-guest='Uncle Dave']");
  await expect(card.getByRole("button", { name: /Uncle Dave is coming/ })).toBeVisible();
  await expect(card.getByRole("button", { name: /Uncle Dave can't come/ })).toBeVisible();
});
