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

  const outcome = await replyStore.submitShared({ name, relation, attending, partySize });
  if (outcome === "closed") return Response.json({ error: "closed" }, { status: 403 });

  // Deliberately generic: never reveal who is on the guest list.
  return Response.json({ ok: true, attending });
}
