"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminAction } from "@/lib/admin-auth";
import { ValidationError } from "@/lib/event";
import { eventStore } from "@/lib/stores";

export async function saveEventSettings(data: FormData) {
  await requireAdminAction();
  const days = String(data.get("replyDeadlineDays") ?? "").trim();
  try {
    await eventStore.update({
      name: String(data.get("name") ?? ""),
      date: String(data.get("date") ?? ""),
      time: String(data.get("time") ?? ""),
      place: String(data.get("place") ?? ""),
      timeZone: String(data.get("timeZone") ?? ""),
      replyDeadlineDays: days === "" ? null : Number(days),
    });
  } catch (err) {
    if (err instanceof ValidationError) redirect(`/admin/settings?error=${encodeURIComponent(err.message)}`);
    throw err;
  }
  revalidatePath("/", "layout");
  redirect("/admin/settings?saved=1");
}
