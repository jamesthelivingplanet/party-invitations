import { expect, type Page } from "@playwright/test";

export async function loginAsHost(page: Page) {
  await page.goto("/admin");
  await page.fill("input[name=password]", "e2e-password");
  await page.press("input[name=password]", "Enter");
  await page.waitForURL("**/admin");
}

/** Reply through the Shared link the way a Guest does. */
export async function replyOnSharedLink(
  page: Page,
  reply: { name: string; relation: string; coming: boolean; partySize?: number },
) {
  await page.goto("/?lang=en");
  await page.fill("input[name=name]", reply.name);
  await page.fill("input[name=relation]", reply.relation);
  await page.getByRole("button", { name: reply.coming ? "Yes!" : "Can't make it" }).click();
  if (reply.coming && reply.partySize) await page.fill("input[name=partySize]", String(reply.partySize));
  await page.getByRole("button", { name: /send/i }).click();
}

export async function dashboardNumbers(page: Page) {
  const text = (await page.locator("section[aria-label=Summary]").innerText()).replace(/\s+/g, " ");
  const n = (label: string) => Number(new RegExp(`${label}\\s+(\\d+)`, "i").exec(text)?.[1]);
  const numbers = {
    headcount: n("People coming"),
    coming: n("Confirmed RSVPs"),
    notReplied: n("Not replied yet"),
    declined: n("Declined"),
    review: n("Needs review"),
  };
  expect(Object.values(numbers).every(Number.isInteger)).toBe(true);
  return numbers;
}
