import type { Client } from "@libsql/client";
import { ensureRsvpSchema } from "./db";
import { replyDeadlinePassed, type EventSettings } from "./event";
import type { Guest } from "./guests";
import type { JevAnswer } from "./match";

export type { JevAnswer };
export type Jev = (
  input: { name: string; relation: string },
  guests: Pick<Guest, "id" | "name" | "notes">[],
) => Promise<JevAnswer>;

export const CONFIRM_THRESHOLD = 0.85;
export const REVIEW_THRESHOLD = 0.4;
/** If Jev says "nobody" but a real guest still has at least this probability, flag it for review. */
export const SOFT_THRESHOLD = 0.15;

export type SharedReply = { name: string; relation: string; attending: boolean; partySize: number };
export type PersonalReply = { attending: boolean; partySize: number };
export type SubmitOutcome = "confirmed" | "review" | "no_match" | "closed";

export type Reply = {
  id: number;
  createdAt: string;
  name: string;
  relation: string;
  attending: boolean;
  partySize: number;
  confidence: number | null;
  suggestedGuestId: string | null;
  suggestedGuestName: string;
};

/** The reply that counts for one guest (or for one person the host welcomed by name). */
export type Entry = {
  reply: Reply;
  key: string;
  name: string;
  by: "jev" | "assigned" | "new";
  replyCount: number;
};

export type Summary = {
  guests: Guest[];
  coming: Entry[];
  declined: Entry[];
  noReply: Guest[];
  review: Reply[];
  dismissed: Reply[];
  headcount: number;
  totalReplies: number;
};

type Row = {
  id: number;
  created_at: string;
  name: string;
  relation: string;
  attending: number;
  party_size: number;
  matched_guest_id: string | null;
  confidence: number | null;
  status: "matched" | "review" | "unmatched";
  decision: "assigned" | "new_guest" | "dismissed" | null;
  assigned_guest_id: string | null;
  new_guest_name: string | null;
};

type Guests = { list(opts?: { includeArchived?: boolean }): Promise<Guest[]> };

function decide(answer: JevAnswer): { guestId: string | null; confidence: number; status: Row["status"] } {
  const { picked, probabilities: probs } = answer;
  const confidence = probs[picked] ?? 0;
  if (picked === "none") {
    // Jev thinks this is nobody on the list, but a plausible runner-up is worth the host's attention.
    const [bestId, bestP] =
      Object.entries(probs)
        .filter(([id]) => id !== "none")
        .sort((a, b) => b[1] - a[1])[0] ?? [];
    if (bestId && bestP >= SOFT_THRESHOLD) return { guestId: bestId, confidence: bestP, status: "review" };
    return { guestId: null, confidence, status: "unmatched" };
  }
  if (confidence >= CONFIRM_THRESHOLD) return { guestId: picked, confidence, status: "matched" };
  if (confidence >= REVIEW_THRESHOLD) return { guestId: picked, confidence, status: "review" };
  return { guestId: null, confidence, status: "unmatched" };
}

type Event = { get(): Promise<EventSettings> };

/**
 * `event` and `now` decide the Reply deadline; the clock comes from outside so it can be controlled.
 * Without `event`, Replies are always open.
 */
export function createReplyStore(
  db: Client,
  deps: { guests: Guests; jev: Jev; event?: Event; now?: () => Date },
) {
  let ready: Promise<void> | null = null;
  const ensure = () => (ready ??= ensureRsvpSchema(db));

  async function setDecision(id: number, sql: string, args: (string | number | null)[]) {
    await ensure();
    await db.execute({ sql: `UPDATE rsvps SET ${sql} WHERE id = ?`, args: [...args, id] });
  }

  return {
    /** Whether Replies can still be sent or changed (the admin is never restricted). */
    async repliesOpen(): Promise<boolean> {
      if (!deps.event) return true;
      return !replyDeadlinePassed(await deps.event.get(), (deps.now ?? (() => new Date()))());
    },

    /** A reply sent through the Shared link: Jev tries to match it to a guest. */
    async submitShared(reply: SharedReply): Promise<SubmitOutcome> {
      if (!(await this.repliesOpen())) return "closed";
      let match: ReturnType<typeof decide> = { guestId: null, confidence: 0, status: "review" };
      try {
        match = decide(await deps.jev(reply, await deps.guests.list()));
      } catch (err) {
        // If Jev is unreachable, still save the reply so nothing is lost.
        console.error("Jev match failed", err);
      }
      await ensure();
      await db.execute({
        sql: `INSERT INTO rsvps (name, relation, attending, party_size, matched_guest_id, confidence, status)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          reply.name,
          reply.relation,
          reply.attending ? 1 : 0,
          reply.partySize,
          match.guestId,
          match.confidence,
          match.status,
        ],
      });
      return match.status === "matched" ? "confirmed" : match.status === "review" ? "review" : "no_match";
    },

    /** The Guest a Personal link was made for, or null for an unknown code or an archived Guest. */
    async guestForPersonalLink(code: string): Promise<Guest | null> {
      if (!code) return null;
      const all = await deps.guests.list();
      return all.find((g) => g.personalLinkCode === code) ?? null;
    },

    /** A Reply through a Personal link: the code says who is replying, so no Match is needed. */
    async submitPersonal(code: string, reply: PersonalReply): Promise<"recorded" | "unknown_link" | "closed"> {
      const guest = await this.guestForPersonalLink(code);
      if (!guest) return "unknown_link";
      if (!(await this.repliesOpen())) return "closed";
      await ensure();
      await db.execute({
        sql: `INSERT INTO rsvps (name, relation, attending, party_size, matched_guest_id, confidence, status)
              VALUES (?, ?, ?, ?, ?, 1, 'matched')`,
        args: [guest.name, "Personal link", reply.attending ? 1 : 0, reply.attending ? reply.partySize : 1, guest.id],
      });
      return "recorded";
    },

    /** The Reply that currently counts for the Guest behind a Personal link, or null if none yet (or unknown link). */
    async currentForPersonalLink(code: string): Promise<PersonalReply | null> {
      const guest = await this.guestForPersonalLink(code);
      if (!guest) return null;
      const { coming, declined } = await this.summary();
      const entry = [...coming, ...declined].find((e) => e.key === guest.id);
      return entry ? { attending: entry.reply.attending, partySize: entry.reply.partySize } : null;
    },

    async assignToGuest(id: number, guestId: string) {
      if (!(await deps.guests.list()).some((g) => g.id === guestId)) throw new Error("Unknown guest");
      await setDecision(id, "decision='assigned', assigned_guest_id=?, new_guest_name=NULL", [guestId]);
    },

    /** Not on the list, but welcome: counts as coming under this name. */
    async welcomeAs(id: number, name: string) {
      const clean = name.trim().slice(0, 100);
      if (!clean) throw new Error("Name required");
      await setDecision(id, "decision='new_guest', new_guest_name=?, assigned_guest_id=NULL", [clean]);
    },

    async markNotInvited(id: number) {
      await setDecision(id, "decision='dismissed', assigned_guest_id=NULL, new_guest_name=NULL", []);
    },

    async undo(id: number) {
      await setDecision(id, "decision=NULL, assigned_guest_id=NULL, new_guest_name=NULL", []);
    },

    async summary(): Promise<Summary> {
      await ensure();
      const allGuests = await deps.guests.list({ includeArchived: true });
      const guests = allGuests.filter((g) => !g.archived);
      const archivedIds = new Set(allGuests.filter((g) => g.archived).map((g) => g.id));
      const nameOf = (id: string | null) => allGuests.find((g) => g.id === id)?.name ?? "—";
      const rows = (await db.execute("SELECT * FROM rsvps ORDER BY id DESC")).rows as unknown as Row[];
      const toReply = (r: Row): Reply => ({
        id: r.id,
        createdAt: r.created_at,
        name: r.name,
        relation: r.relation,
        attending: !!r.attending,
        partySize: r.party_size,
        confidence: r.confidence,
        suggestedGuestId: r.status === "review" ? r.matched_guest_id : null,
        suggestedGuestName: nameOf(r.status === "review" ? r.matched_guest_id : null),
      });

      // Apply the host's decisions on top of Jev's matches (oldest first, so the latest reply wins).
      const latest = new Map<string, Entry>();
      const review: Reply[] = [];
      const dismissed: Reply[] = [];
      for (const r of [...rows].reverse()) {
        let eff: Omit<Entry, "replyCount"> | null = null;
        const reply = toReply(r);
        if (r.decision === "dismissed") {
          dismissed.push(reply);
          continue;
        } else if (r.decision === "assigned" && r.assigned_guest_id) {
          eff = { reply, key: r.assigned_guest_id, name: nameOf(r.assigned_guest_id), by: "assigned" };
        } else if (r.decision === "new_guest" && r.new_guest_name) {
          eff = { reply, key: `new:${r.id}`, name: r.new_guest_name, by: "new" };
        } else if (r.status === "matched" && r.matched_guest_id) {
          eff = { reply, key: r.matched_guest_id, name: nameOf(r.matched_guest_id), by: "jev" };
        }
        if (!eff) {
          review.push(reply);
          continue;
        }
        if (archivedIds.has(eff.key)) continue; // archived guests don't count
        latest.set(eff.key, { ...eff, replyCount: (latest.get(eff.key)?.replyCount ?? 0) + 1 });
      }

      const newestFirst = (a: { id: number }, b: { id: number }) => b.id - a.id;
      const byNewest = (a: Entry, b: Entry) => newestFirst(a.reply, b.reply);
      review.sort(newestFirst);
      dismissed.sort(newestFirst);
      const entries = [...latest.values()];
      const coming = entries.filter((e) => e.reply.attending).sort(byNewest);
      return {
        guests,
        coming,
        declined: entries.filter((e) => !e.reply.attending).sort(byNewest),
        noReply: guests.filter((g) => !latest.has(g.id)),
        review,
        dismissed,
        headcount: coming.reduce((n, e) => n + e.reply.partySize, 0),
        totalReplies: rows.length,
      };
    },
  };
}
