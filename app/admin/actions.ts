"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/admin-auth";
import { db, ensureSchema } from "@/lib/db";
import { guestStore } from "@/lib/stores";

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

  await ensureSchema();

  if (intent === "assign") {
    const guestId = String(formData.get("guest_id") ?? "");
    if (!(await guestStore.list()).some((g) => g.id === guestId)) throw new Error("Unknown guest");
    await db.execute({
      sql: "UPDATE rsvps SET decision='assigned', assigned_guest_id=?, new_guest_name=NULL WHERE id=?",
      args: [guestId, id],
    });
  } else if (intent === "new") {
    const name = String(formData.get("new_name") ?? "").trim().slice(0, 100);
    if (!name) throw new Error("Name required");
    await db.execute({
      sql: "UPDATE rsvps SET decision='new_guest', new_guest_name=?, assigned_guest_id=NULL WHERE id=?",
      args: [name, id],
    });
  } else if (intent === "dismiss") {
    await db.execute({
      sql: "UPDATE rsvps SET decision='dismissed', assigned_guest_id=NULL, new_guest_name=NULL WHERE id=?",
      args: [id],
    });
  } else if (intent === "undo") {
    await db.execute({
      sql: "UPDATE rsvps SET decision=NULL, assigned_guest_id=NULL, new_guest_name=NULL WHERE id=?",
      args: [id],
    });
  } else {
    throw new Error("Unknown action");
  }

  revalidatePath("/admin");
}
