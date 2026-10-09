import { replyStore } from "@/lib/stores";

/**
 * After a Reply goes to review, the visitor may say how the Host can reach them. The token that came back with their
 * Reply is the only way to attach it. Says nothing about who is on the Guest list.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token.slice(0, 100) : "";
  const contact = typeof body?.contact === "string" ? body.contact : "";
  if (!contact.trim()) return Response.json({ error: "missing_fields" }, { status: 400 });
  const outcome = await replyStore.attachReviewContact(token, contact);
  if (outcome === "not_found") return Response.json({ error: "unknown_token" }, { status: 404 });
  return Response.json({ ok: true });
}
