import { readCompanions } from "@/lib/companions-input";
import { clampPartySize } from "@/lib/party";
import { failureStatus } from "@/lib/reply-http";
import { replyStore } from "@/lib/stores";

/** Someone the Shared link could not Match leaves their details. Saved as a Request, never as a Reply. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  // A live Personal link code marks the Request as arriving through a forwarded link; anything else is the Shared link.
  const code = typeof body?.code === "string" ? body.code.slice(0, 200) : "";
  const forwarded = !!code && !!(await replyStore.guestForPersonalLink(code));
  const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
  const attending = typeof body?.attending === "boolean" ? body.attending : null;
  const partySize = clampPartySize(body?.partySize);
  const c = body?.contacts ?? {};

  const outcome = await replyStore.submitRequest({
    name: text(body?.name, 100),
    attending,
    partySize,
    companions: readCompanions(body),
    source: forwarded ? "personal_forward" : "shared",
    ownWords: text(body?.ownWords, 1000),
    contacts: {
      phone: text(c.phone, 200),
      email: text(c.email, 200),
      whatsapp: text(c.whatsapp, 200),
      messenger: text(c.messenger, 200),
      other: text(c.other, 200),
    },
  });
  if (outcome !== "recorded") return Response.json({ error: outcome }, { status: failureStatus(outcome) ?? 400 });
  return Response.json({ ok: true });
}
