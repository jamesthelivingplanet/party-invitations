import { readCompanions } from "@/lib/companions-input";
import { replyStore } from "@/lib/stores";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? "").trim().slice(0, 100);
  const relation = String(body?.relation ?? "").trim().slice(0, 200);
  const attending = body?.attending === true;
  const partySize = Math.min(Math.max(Number(body?.partySize) || 1, 1), 10);

  if (!name || !relation) {
    return Response.json({ error: "missing_fields" }, { status: 400 });
  }

  const reply = { name, relation, attending, partySize, companions: readCompanions(body) };
  // A forwarded Personal link ("Not [name]?") goes through the same Matching; the code only has to be a live link.
  const code = typeof body?.code === "string" ? body.code.slice(0, 200) : "";
  const outcome = code ? await replyStore.submitFromPersonalLink(code, reply) : await replyStore.submitShared(reply);
  if (outcome === "unknown_link") return Response.json({ error: outcome }, { status: 404 });
  if (outcome === "no_longer_available") return Response.json({ error: outcome }, { status: 410 });
  if (outcome === "companion_count" || outcome === "companion_incomplete") {
    return Response.json({ error: outcome }, { status: 400 });
  }

  // Never names a Guest: only how sure the Match was.
  return Response.json({ ok: true, attending, outcome });
}
