"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/admin-auth";
import { replyStore } from "@/lib/stores";

/** Accept the Request (making the person a Guest in the chosen language) or decline it. */
export async function decideRequest(formData: FormData) {
  await requireAdminAction();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) throw new Error("Bad request id");
  const intent = formData.get("intent");

  if (intent === "accept") await replyStore.acceptRequest(id, formData.get("language") === "es" ? "es" : "en");
  else if (intent === "decline") await replyStore.declineRequest(id);
  else throw new Error("Unknown action");

  revalidatePath("/admin/requests");
  revalidatePath("/admin/invitations");
  revalidatePath("/admin");
}
