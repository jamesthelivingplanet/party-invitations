import { replyStore } from "@/lib/stores";

/** A Reply through a Personal link. The code says who is replying. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const code = String(body?.code ?? "").slice(0, 200);
  const attending = body?.attending === true;
  const partySize = Math.min(Math.max(Number(body?.partySize) || 1, 1), 10);

  const outcome = await replyStore.submitPersonal(code, { attending, partySize });
  if (outcome === "unknown_link") return Response.json({ error: "unknown_link" }, { status: 404 });
  if (outcome === "no_longer_available") return Response.json({ error: "no_longer_available" }, { status: 410 });
  return Response.json({ ok: true, attending });
}
