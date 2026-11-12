import { readCompanions } from "@/lib/companions-input";
import { clampPartySize } from "@/lib/party";
import { failureStatus } from "@/lib/reply-http";
import { fullPlace } from "@/lib/event";
import { buildIcs, googleCalendarUrl } from "@/lib/calendar";
import { eventStore, replyStore } from "@/lib/stores";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? "").trim().slice(0, 100);
  const relation = String(body?.relation ?? "").trim().slice(0, 200);
  const attending = body?.attending === true;
  const partySize = clampPartySize(body?.partySize);

  if (!name || !relation) {
    return Response.json({ error: "missing_fields" }, { status: 400 });
  }

  const reply = { name, relation, attending, partySize, companions: readCompanions(body) };
  // A forwarded Personal link ("Not [name]?") goes through the same Matching; the code only has to be a live link.
  const code = typeof body?.code === "string" ? body.code.slice(0, 200) : "";
  const { outcome, token } = code ? await replyStore.submitFromPersonalLink(code, reply) : await replyStore.submitShared(reply);
  const status = failureStatus(outcome);
  if (status) return Response.json({ error: outcome }, { status });

  // Never names a Guest: only how sure the Match was. The token belongs to this visitor alone (see SubmitResult).
  // The place is only revealed to someone the Guest list recognised (a confident Match) who is coming.
  let location = null;
  if (outcome === "confirmed" && attending) {
    const event = await eventStore.get();
    location = {
      place: fullPlace(event),
      mapUrl: event.mapUrl,
      googleUrl: googleCalendarUrl(event),
      ics: buildIcs(event, new Date()),
    };
  }
  return Response.json({ ok: true, attending, outcome, token, location });
}
