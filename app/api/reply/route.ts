import { readChildren, readCompanions } from "@/lib/companions-input";
import { clampPartySize } from "@/lib/party";
import { failureStatus } from "@/lib/reply-http";
import { replyStore } from "@/lib/stores";

/** A Reply through a Personal link. The code says who is replying. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const code = String(body?.code ?? "").slice(0, 200);
  const attending = body?.attending === true;
  const partySize = clampPartySize(body?.partySize);

  const outcome = await replyStore.submitPersonal(code, {
    attending,
    partySize,
    companions: readCompanions(body),
    withPartner: body?.withPartner === true,
    children: readChildren(body),
  });
  if (outcome !== "recorded") return Response.json({ error: outcome }, { status: failureStatus(outcome) ?? 400 });
  // The household as it now stands (a Reply given to the partner may have been recorded or withdrawn).
  return Response.json({ ok: true, attending, household: await replyStore.householdForPersonalLink(code) });
}
