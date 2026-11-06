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
  if (reply.coming && reply.partySize) {
    await page.fill("input[name=partySize]", String(reply.partySize));
    await fillCompanions(page, reply.partySize - 1);
  }
  await page.getByRole("button", { name: /send/i }).click();
}

export async function dashboardNumbers(page: Page) {
  await expect(page.locator("section[aria-label=Summary]")).toBeVisible(); // the admin shows a loading state first
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

/** Names n Companions "Companion 1".."Companion n", all adults, on whichever form is open. */
export async function fillCompanions(page: Page, n: number) {
  for (let i = 0; i < n; i++) {
    await page.fill(`input[name=companion-name-${i}]`, `Companion ${i + 1}`);
    await page.selectOption(`select[name=companion-kind-${i}]`, "adult");
  }
}

/** Adds a Guest through the Guests screen (the Host must be logged in), so a test has a Guest no other test replies for. */
export async function addGuestOnList(page: Page, name: string) {
  await page.goto("/admin/guests");
  await page.fill("#new-name", name);
  await page.getByRole("button", { name: "Add guest" }).click();
  await expect(page.locator(`li[data-guest='${name}']`)).toBeVisible();
}
