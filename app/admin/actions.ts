"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/admin-auth";
import { replyStore } from "@/lib/stores";

/**
 * The host's decision on a reply.
 *  assign  – this reply is from guest `guest_id` on the list
 *  new     – not on the list, but welcome: add as `new_name`
 *  dismiss – not invited / ignore
 *  undo    – clear any earlier decision
 */
export async function decide(formData: FormData) {
  await requireAdminAction();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) throw new Error("Bad reply id");
  const intent = formData.get("intent");

  if (intent === "assign") await replyStore.assignToGuest(id, String(formData.get("guest_id") ?? ""));
  else if (intent === "new") await replyStore.welcomeAs(id, String(formData.get("new_name") ?? ""));
  else if (intent === "dismiss") await replyStore.markNotInvited(id);
  else if (intent === "undo") await replyStore.undo(id);
  else throw new Error("Unknown action");

  revalidatePath("/admin");
}
