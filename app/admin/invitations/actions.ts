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
