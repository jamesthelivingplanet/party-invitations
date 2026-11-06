import { expect, test, type Page } from "@playwright/test";
import { dashboardNumbers, loginAsHost } from "./helpers";

const guestRow = (page: Page, name: string) => page.locator(`li[data-guest='${name}']`);
const personalPath = async (page: Page, name: string) =>
  (await guestRow(page, name).locator("[data-personal-path]").getAttribute("data-personal-path"))!;
const scrollsSideways = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

test("linked partners: one answers for both and the children, the other sees it and changes it, counted once", async ({ page }) => {
  // The Host adds Hana (Spanish, has children), then Hugo with Hana as his partner.
  await loginAsHost(page);
  await page.goto("/admin/guests");
  await page.fill("#new-name", "Hana Hogar");
  await page.selectOption("#new-language", "es");
  await page.getByLabel(/Has children/).first().check();
  await page.getByRole("button", { name: "Add guest" }).click();
  await expect(guestRow(page, "Hana Hogar")).toBeVisible();
  await page.fill("#new-name", "Hugo Hogar");
  await page.selectOption("#new-partner", { label: "Hana Hogar" });
  await page.getByRole("button", { name: "Add guest" }).click();
  await expect(guestRow(page, "Hana Hogar")).toContainText("Partner: Hugo Hogar");
  await expect(guestRow(page, "Hugo Hogar")).toContainText("Partner: Hana Hogar");
  await expect(guestRow(page, "Hana Hogar")).toContainText("Has children");
  expect(await scrollsSideways(page)).toBe(false);
  const hana = await personalPath(page, "Hana Hogar");
  const hugo = await personalPath(page, "Hugo Hogar");
  await page.goto("/admin");
  const before = (await dashboardNumbers(page)).headcount;

  // Hana says No first: no household questions.
  await page.goto(hana);
  await page.getByRole("button", { name: "🛑 No puedo ir" }).click();
  await expect(page.getByRole("group", { name: "¿Vienes con Hugo?" })).toHaveCount(0);
  await expect(page.getByRole("group", { name: "¿Y tus hijos?" })).toHaveCount(0);

  // Then Yes: coming with Hugo, and two children, one of them named.
  await page.getByRole("button", { name: "🏎️ ¡Sí!" }).click();
  await expect(page.getByRole("button", { name: "Enviar respuesta" })).toBeDisabled(); // household questions unanswered
  await page.getByRole("group", { name: "¿Vienes con Hugo?" }).getByRole("button", { name: "Sí" }).click();
  await page.getByRole("group", { name: "¿Y tus hijos?" }).getByRole("button", { name: "Sí" }).click();
  await page.fill("input[name=childrenCount]", "2");
  await page.fill("input[name=child-name-0]", "Lulu");
  expect(await scrollsSideways(page)).toBe(false);
  await page.getByRole("button", { name: "Enviar respuesta" }).click();
  await expect(page.getByText("Todo listo")).toBeVisible();
  await expect(page.getByTestId("reply-answer")).toHaveText("Vienes: 4 personas");
  await expect(page.getByTestId("reply-companions")).toContainText("Hugo Hogar");
  await expect(page.getByTestId("reply-children")).toContainText("Lulu");
  await expect(page.getByTestId("reply-children")).toContainText("Hijo/a 2");

  // The Host sees Hugo as coming, answered by Hana, and the four people counted.
  await page.goto("/admin");
  expect((await dashboardNumbers(page)).headcount).toBe(before + 4);
  const hugoRow = page.locator("li", { hasText: "Hugo Hogar" }).filter({ hasText: "Answered by Hana Hogar" });
  await expect(hugoRow).toHaveCount(1);
  await expect(page.getByText("Lulu · child (household)")).toBeVisible();

  // Hugo opens his own link: he sees Hana answered for him, and the questions are filled in.
  await page.goto(`${hugo}?lang=en`);
  await expect(page.getByTestId("reply-answered-by")).toHaveText("Hana Hogar replied for you.");
  await page.getByRole("button", { name: "Change my reply" }).click();
  await expect(page.getByRole("group", { name: "Are you coming with Hana?" }).getByRole("button", { name: "Yes" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("group", { name: "And your children?" }).getByRole("button", { name: "Yes" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("input[name=childrenCount]")).toHaveValue("2");
  await expect(page.locator("input[name=child-name-0]")).toHaveValue("Lulu");
  await page.getByRole("button", { name: "Send reply" }).click();
  await expect(page.getByText("You're all set")).toBeVisible();
  await expect(page.getByTestId("reply-answered-by")).toHaveCount(0);

  // Both parents mentioned the children, but they are counted once; Hugo's Reply is now his own.
  await page.goto("/admin");
  expect((await dashboardNumbers(page)).headcount).toBe(before + 4);
  await expect(page.locator("li", { hasText: "Answered by Hana Hogar" })).toHaveCount(0);

  // The Host unlinks them.
  await page.goto("/admin/guests");
  await guestRow(page, "Hugo Hogar").getByText("Edit").click();
  await guestRow(page, "Hugo Hogar").getByLabel(/Partner/).selectOption("");
  await guestRow(page, "Hugo Hogar").getByRole("button", { name: "Save changes" }).click();
  await expect(guestRow(page, "Hugo Hogar")).not.toContainText("Partner:");
  await expect(guestRow(page, "Hana Hogar")).not.toContainText("Partner:");
});
