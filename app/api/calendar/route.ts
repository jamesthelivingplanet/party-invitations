import { buildIcs } from "@/lib/calendar";
import { eventStore } from "@/lib/stores";

export const dynamic = "force-dynamic";

export async function GET() {
  const event = await eventStore.get();
  return new Response(buildIcs(event, new Date()), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="party-invitations.ics"',
    },
  });
}
