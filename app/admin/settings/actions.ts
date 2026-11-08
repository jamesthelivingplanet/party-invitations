"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminAction } from "@/lib/admin-auth";
import { ValidationError, type Emblem } from "@/lib/event";
import { eventStore } from "@/lib/stores";

export async function saveEventSettings(data: FormData) {
  await requireAdminAction();
  const days = String(data.get("replyDeadlineDays") ?? "").trim();
  const age = String(data.get("childAge") ?? "").trim();
  try {
    await eventStore.update({
      name: String(data.get("name") ?? ""),
      date: String(data.get("date") ?? ""),
      time: String(data.get("time") ?? ""),
      place: String(data.get("place") ?? ""),
      mapUrl: String(data.get("mapUrl") ?? ""),
      timeZone: String(data.get("timeZone") ?? ""),
      childName: String(data.get("childName") ?? ""),
      childFirstName: String(data.get("childFirstName") ?? ""),
      theme: String(data.get("theme") ?? ""),
      clothingSize: String(data.get("clothingSize") ?? ""),
      childAge: age === "" ? null : Number(age),
      emblem: String(data.get("emblem") ?? "") as Emblem,
      replyDeadlineDays: days === "" ? null : Number(days),
    });
  } catch (err) {
    if (err instanceof ValidationError) redirect(`/admin/settings?error=${encodeURIComponent(err.message)}`);
    throw err;
  }
  revalidatePath("/", "layout");
  redirect("/admin/settings?saved=1");
}
