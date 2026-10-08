"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminAction } from "@/lib/admin-auth";
import type { Language } from "@/lib/guests";
import { ValidationError } from "@/lib/invitations";
import { invitationStore } from "@/lib/stores";

export async function saveTemplate(data: FormData) {
  await requireAdminAction();
  const language = String(data.get("language") ?? "") as Language;
  const guest = String(data.get("guest") ?? "");
  const back = (extra: string) => `/admin/invitations?${guest ? `guest=${encodeURIComponent(guest)}&` : ""}${extra}`;
  try {
    await invitationStore.setTemplate(language, String(data.get("body") ?? ""));
  } catch (err) {
    if (err instanceof ValidationError) redirect(back(`error=${encodeURIComponent(err.message)}`));
    throw err;
  }
  revalidatePath("/admin/invitations");
  redirect(back(`saved=${language}`));
}

/** Called after the Host shares or copies a message. */
export async function markSent(guestId: string, sent: boolean) {
  await requireAdminAction();
  await invitationStore.setSent(guestId, sent);
  revalidatePath("/admin/invitations");
}

export async function toggleSent(data: FormData) {
  await requireAdminAction();
  await invitationStore.setSent(String(data.get("guest") ?? ""), data.get("sent") === "1");
  revalidatePath("/admin/invitations");
}

/** Save a one-off message for a single Guest. */
export async function saveGuestMessage(data: FormData) {
  await requireAdminAction();
  const guest = String(data.get("guest") ?? "");
  try {
    await invitationStore.setMessage(guest, String(data.get("body") ?? ""));
  } catch (err) {
    if (err instanceof ValidationError) redirect(`/admin/invitations?error=${encodeURIComponent(err.message)}`);
    throw err;
  }
  revalidatePath("/admin/invitations");
  redirect("/admin/invitations?edited=1");
}

/** Put a Guest's message back to the main template. */
export async function resetGuestMessage(data: FormData) {
  await requireAdminAction();
  await invitationStore.resetMessage(String(data.get("guest") ?? ""));
  revalidatePath("/admin/invitations");
  redirect("/admin/invitations?edited=reset");
}
