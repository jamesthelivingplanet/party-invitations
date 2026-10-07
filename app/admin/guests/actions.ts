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

export async function addGuest(data: FormData) {
  await run(() =>
    guestStore.add({
      name: text(data, "name"),
      language: text(data, "language") as Language,
      notes: text(data, "notes"),
    }),
  );
}

export async function updateGuest(data: FormData) {
  await run(() =>
    guestStore.update(text(data, "id"), {
      name: text(data, "name"),
      language: text(data, "language") as Language,
      notes: text(data, "notes"),
    }),
  );
}

export async function archiveGuest(data: FormData) {
  await run(() => guestStore.archive(text(data, "id")));
}

export async function restoreGuest(data: FormData) {
  await run(() => guestStore.restore(text(data, "id")));
}
