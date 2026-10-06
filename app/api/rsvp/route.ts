import { db, ensureSchema } from "@/lib/db";
import { matchGuest, type MatchResult } from "@/lib/match";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? "").trim().slice(0, 100);
  const relation = String(body?.relation ?? "").trim().slice(0, 200);
  const attending = body?.attending === true;
  const partySize = Math.min(Math.max(Number(body?.partySize) || 1, 1), 10);

  if (!name || !relation) {
    return Response.json({ error: "missing_fields" }, { status: 400 });
  }

  // If Jev is unreachable, still save the RSVP so nothing is lost.
  let match: MatchResult = { guestId: null, confidence: 0, status: "review" };
  try {
    match = await matchGuest({ name, relation });
  } catch (err) {
    console.error("Jev match failed", err);
  }

  await ensureSchema();
  await db.execute({
    sql: `INSERT INTO rsvps (name, relation, attending, party_size, matched_guest_id, confidence, status)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [name, relation, attending ? 1 : 0, partySize, match.guestId, match.confidence, match.status],
  });

  // Deliberately generic: never reveal who is on the guest list.
  return Response.json({ ok: true, attending });
}
