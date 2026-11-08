import { buildIcs, withoutLocation } from "@/lib/calendar";
import { eventStore, replyStore } from "@/lib/stores";

export const dynamic = "force-dynamic";

/** The place only goes in the file for a live Personal link (`?code=`); anyone else gets the time without it. */
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code") ?? "";
  const guest = code ? await replyStore.guestForPersonalLink(code) : null;
  const event = await eventStore.get();
  const visible = guest && !guest.archived ? event : withoutLocation(event);
  return new Response(buildIcs(visible, new Date()), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="birthday.ics"',
    },
  });
}
