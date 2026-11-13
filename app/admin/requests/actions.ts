"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminAction } from "@/lib/admin-auth";
import { ValidationError } from "@/lib/guests";
import { replyStore } from "@/lib/stores";

/** Accept the Request (making the person a Guest in the chosen language), give it to an existing Guest, or decline it. */
export async function decideRequest(formData: FormData) {
  await requireAdminAction();
  try {
    await decide(formData);
  } catch (err) {
    if (err instanceof ValidationError) redirect(`/admin/requests?error=${encodeURIComponent(err.message)}`);
    throw err;
  }
  revalidatePath("/admin/requests");
  revalidatePath("/admin/invitations");
  revalidatePath("/admin");
}

async function decide(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) throw new Error("Bad request id");
  const intent = formData.get("intent");

  if (intent === "accept") {
    await replyStore.acceptRequest(id, formData.get("language") === "es" ? "es" : "en", {
      name: String(formData.get("name") ?? ""),
      partnerId: String(formData.get("partner_id") ?? "") || null,
      hasChildren: formData.get("has_children") === "on",
    });
  }
  else if (intent === "existing") {
    const outcome = await replyStore.assignRequestToGuest(id, String(formData.get("guest_id") ?? ""));
    if (outcome === "unknown_guest") throw new Error("Unknown guest");
  } else if (intent === "decline") await replyStore.declineRequest(id);
  else throw new Error("Unknown action");
}
