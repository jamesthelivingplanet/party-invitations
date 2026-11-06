"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminAction } from "@/lib/admin-auth";
import { ValidationError, type Language } from "@/lib/guests";
import { guestStore } from "@/lib/stores";

/** Runs a change, then returns to the Guests screen (with the problem shown if the input was invalid). */
async function run(change: () => Promise<unknown>): Promise<never> {
  await requireAdminAction();
  try {
    await change();
  } catch (err) {
    if (err instanceof ValidationError) redirect(`/admin/guests?error=${encodeURIComponent(err.message)}`);
    throw err;
  }
  revalidatePath("/admin/guests");
  redirect("/admin/guests");
}

const text = (data: FormData, key: string) => String(data.get(key) ?? "");

/** The partner picked on the form ("" for no partner). */
const partner = (data: FormData) => text(data, "partner_id") || null;

export async function addGuest(data: FormData) {
  await run(async () => {
    // Check the partner first, so a refused partner does not leave a half-added Guest.
    const picked = partner(data);
    if (picked && !(await guestStore.list()).some((g) => g.id === picked && !g.partnerId)) {
      throw new ValidationError("Pick another active guest without a partner.");
    }
    const guest = await guestStore.add({
      name: text(data, "name"),
      language: text(data, "language") as Language,
      notes: text(data, "notes"),
      hasChildren: data.get("has_children") === "on",
    });
    if (picked) await guestStore.setPartner(guest.id, picked);
  });
}

export async function updateGuest(data: FormData) {
  await run(async () => {
    const id = text(data, "id");
    await guestStore.update(id, {
      name: text(data, "name"),
      language: text(data, "language") as Language,
      notes: text(data, "notes"),
      hasChildren: data.get("has_children") === "on",
    });
    const current = (await guestStore.list({ includeArchived: true })).find((g) => g.id === id)?.partnerId ?? null;
    if (partner(data) !== current) await guestStore.setPartner(id, partner(data));
  });
}

export async function archiveGuest(data: FormData) {
  await run(() => guestStore.archive(text(data, "id")));
}

export async function restoreGuest(data: FormData) {
  await run(() => guestStore.restore(text(data, "id")));
}

export async function regenerateLink(data: FormData) {
  await run(() => guestStore.regeneratePersonalLink(text(data, "id")));
}
