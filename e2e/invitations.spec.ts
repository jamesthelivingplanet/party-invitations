import { expect, test } from "@playwright/test";
import { loginAsHost } from "./helpers";

test("the Host edits a template and the preview for a Spanish Guest follows it", async ({ page }) => {
  await loginAsHost(page);
  await page.goto("/admin/guests");
  await page.fill("#new-name", "Lupita Plantilla");
  await page.selectOption("#new-language", "es");
  await page.getByRole("button", { name: "Add guest" }).click();

  await page.goto("/admin/invitations");
  await page.selectOption("#preview-guest", { label: "Lupita Plantilla (Spanish)" });
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  const preview = page.getByTestId("message-preview");
  await expect(preview).toContainText("¡Hola Lupita Plantilla!");
  await expect(preview).toContainText("por confirmar");
  await expect(preview).toContainText("/i/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);

  await page.fill("#body-es", "Qué onda {name}, ven a {event}: {link}");
  await page.getByRole("button", { name: "Save Spanish message" }).click();
  await expect(page.getByText("Spanish message saved.")).toBeVisible();
  await expect(page.getByTestId("message-preview")).toContainText("Qué onda Lupita Plantilla, ven a");

  await page.fill("#body-es", "sin enlace");
  await page.getByRole("button", { name: "Save Spanish message" }).click();
  await expect(page.locator("p[role=alert]")).toContainText("{link}");
});
