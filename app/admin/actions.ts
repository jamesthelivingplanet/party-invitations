"use server";

import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import guests from "@/guests.json";
import { db, ensureSchema } from "@/lib/db";

// Server Actions are reachable by direct POST, so authorize inside the action itself.
function authorized(key: FormDataEntryValue | null) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || typeof key !== "string") return false;
  const a = Buffer.from(key);
  const b = Buffer.from(pw);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * The host's decision on a reply.
 *  assign  – this reply is from guest `guest_id` on the list
 *  new     – not on the list, but welcome: add as `new_name`
 *  dismiss – not invited / ignore
 *  undo    – clear any earlier decision
 */
export async function decide(formData: FormData) {
  if (!authorized(formData.get("key"))) throw new Error("Unauthorized");

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) throw new Error("Bad reply id");
  const intent = formData.get("intent");

  await ensureSchema();

  if (intent === "assign") {
    const guestId = String(formData.get("guest_id") ?? "");
    if (!guests.some((g) => g.id === guestId)) throw new Error("Unknown guest");
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
