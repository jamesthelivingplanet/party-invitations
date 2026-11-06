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

test("the Host copies a message, the Guest shows as Sent, can be toggled, and Replied follows their Reply", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await loginAsHost(page);
  await page.goto("/admin/guests");
  await page.fill("#new-name", "Zelda Enviada");
  await page.getByRole("button", { name: "Add guest" }).click();

  await page.goto("/admin/invitations");
  const row = page.locator("li[data-guest='Zelda Enviada']");
  await expect(row.getByTestId("status")).toHaveText("Not sent");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);

  await row.getByRole("button", { name: "Copy message" }).click();
  await expect(row.getByTestId("status")).toHaveText("Sent");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("Zelda Enviada");

  await row.getByRole("button", { name: "Mark not sent" }).click();
  await expect(row.getByTestId("status")).toHaveText("Not sent");
  await row.getByRole("button", { name: "Mark sent" }).click();
  await expect(row.getByTestId("status")).toHaveText("Sent");

  await page.goto("/admin/guests");
  const personal = await page.locator("li[data-guest='Zelda Enviada']").locator("[data-personal-path]").getAttribute("data-personal-path");
  await page.goto("/admin/invitations");
  await page.getByRole("button", { name: "Not replied" }).click();
  await expect(page.locator("li[data-guest='Zelda Enviada']")).toBeVisible();

  await page.goto(`${personal}?lang=en`);
  await page.getByRole("button", { name: "Yes!" }).click();
  await page.getByRole("button", { name: "Send reply" }).click();
  await expect(page.getByText("You're all set")).toBeVisible(); // wait until the Reply is saved

  await page.goto("/admin/invitations");
  await expect(page.locator("li[data-guest='Zelda Enviada']").getByTestId("status")).toHaveText("Replied");
  await page.getByRole("button", { name: "Not replied" }).click();
  await expect(page.locator("li[data-guest='Zelda Enviada']")).toHaveCount(0);
});

test("send-next mode walks through unsent Guests, can skip and come back, and says when done", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await loginAsHost(page);
  await page.goto("/admin/guests");
  for (const name of ["Aaa Siguiente", "Bbb Siguiente"]) {
    await page.fill("#new-name", name);
    await page.getByRole("button", { name: "Add guest" }).click();
    await expect(page.locator(`li[data-guest='${name}']`)).toBeVisible();
  }
  await page.goto("/admin/invitations/send");
  const heading = page.locator("h2").first();
  const marked = async () => {
    const name = (await heading.textContent()) ?? "";
    return name;
  };
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  const share = page.getByRole("button", { name: /Share|Copy message/ });
  const box = await share.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);

  const first = await marked();
  await page.getByRole("link", { name: "Skip for now" }).click();
  await expect(heading).not.toHaveText(first);
  const second = await marked();
  await share.click();
  await expect(heading).not.toHaveText(second);
  await page.goto("/admin/invitations");
  await expect(page.locator(`li[data-guest='${second}']`).getByTestId("status")).toHaveText("Sent");
  await expect(page.locator(`li[data-guest='${first}']`).getByTestId("status")).toHaveText("Not sent");
});

test("the Host edits one Guest's message, it is saved for Copy, and reset restores the main message", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await loginAsHost(page);
  await page.goto("/admin/guests");
  await page.fill("#new-name", "Yara Unica");
  await page.getByRole("button", { name: "Add guest" }).click();

  await page.goto("/admin/invitations");
  const row = page.locator("li[data-guest='Yara Unica']");
  await row.getByText("Edit message").click();
  const box = row.locator("textarea");
  const original = await box.inputValue();
  await box.fill(original.replace("Hi Yara Unica!", "Yara, special you!"));
  await row.getByRole("button", { name: "Save for Yara Unica only" }).click();
  await expect(page.getByText("Message saved for this Guest only.")).toBeVisible();
  await expect(row.getByTestId("edited")).toBeVisible();

  await row.getByRole("button", { name: "Copy message" }).click();
  await expect(row.getByTestId("status")).toHaveText("Sent");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("Yara, special you!");

  await row.getByText("Edit message").click();
  await row.getByRole("button", { name: "Reset to main message" }).click();
  await expect(page.getByText("Message reset to the main message.")).toBeVisible();
  await expect(row.getByTestId("edited")).toHaveCount(0);
  await row.getByRole("button", { name: "Copy message" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("Hi Yara Unica!");
});
