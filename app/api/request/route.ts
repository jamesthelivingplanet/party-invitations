import { readCompanions } from "@/lib/companions-input";
import { replyStore } from "@/lib/stores";

/** Someone the Shared link could not Match leaves their details. Saved as a Request, never as a Reply. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
  const attending = typeof body?.attending === "boolean" ? body.attending : null;
  const partySize = Math.min(Math.max(Number(body?.partySize) || 1, 1), 10);
  const c = body?.contacts ?? {};

  const outcome = await replyStore.submitRequest({
    name: text(body?.name, 100),
    attending,
    partySize,
    companions: readCompanions(body),
    source: "shared",
    ownWords: text(body?.ownWords, 1000),
    contacts: {
      phone: text(c.phone, 200),
      email: text(c.email, 200),
      whatsapp: text(c.whatsapp, 200),
      messenger: text(c.messenger, 200),
      other: text(c.other, 200),
    },
  });
  if (outcome !== "recorded") return Response.json({ error: outcome }, { status: 400 });
  return Response.json({ ok: true });
}
