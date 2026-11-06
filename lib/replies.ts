import { randomBytes } from "node:crypto";
import type { Client, InStatement } from "@libsql/client";
import { ensureRsvpSchema } from "./db";
import { replyDeadlinePassed, type EventSettings } from "./event";
import type { Guest, GuestInput, Language } from "./guests";
import type { JevAnswer } from "./match";
import { MAX_PARTY_SIZE } from "./party";

export type { JevAnswer };
export type Jev = (
  input: { name: string; relation: string },
  guests: Pick<Guest, "id" | "name" | "notes">[],
) => Promise<JevAnswer>;

export const CONFIRM_THRESHOLD = 0.85;
/** Below this a Match is no Match: nothing goes to review, the visitor leaves details and a Request is made. */
export const REVIEW_THRESHOLD = 0.4;

export type Companion = { name: string; kind: "adult" | "child" };
type CompanionInput = { companions?: Companion[] };
/**
 * One of a household's children coming, from "And your children?". Unlike a Companion, the name and the adult or
 * child label are optional ("" and null); an unlabelled child counts as a child.
 */
export type Child = { name: string; kind: "adult" | "child" | null };
export type SharedReply = { name: string; relation: string; attending: boolean; partySize: number } & CompanionInput;
export type PersonalReply = {
  attending: boolean;
  partySize: number;
  /** "Are you coming with <partner>?" Only used when coming and the Guest has an active linked partner. */
  withPartner?: boolean;
  /**
   * "And your children?": the children coming ([] for none), or null/left out when not answered. Only used when coming
   * and the Guest or their partner is marked as having children. They are not part of `partySize`.
   */
  children?: Child[] | null;
} & CompanionInput;
export type CompanionProblem = "companion_count" | "companion_incomplete";
export type ChildrenProblem = "children_count";
export type SubmitOutcome = "confirmed" | "review" | "no_match" | "closed" | CompanionProblem;
/**
 * What a Shared-link or "Not [name]?" Reply came to. `token` is an unguessable secret given only to this visitor:
 * after "review" it lets them attach optional contact details to that review item; after "no_match" it carries
 * Jev's weak guess over to the Request they are about to leave. It never reveals a Guest.
 */
export type SubmitResult = { outcome: SubmitOutcome; token?: string };
/** Jev's closest (but too weak) Guest for a Request, for the Host only. */
export type WeakGuess = { guestId: string; guestName: string; confidence: number };
export type RequestSource = "shared" | "personal_forward";
export type ContactMethods = { phone?: string; email?: string; whatsapp?: string; messenger?: string; other?: string };
export type RequestInput = {
  name: string;
  /** Their coming answer, or left out/null if they did not give one. */
  attending?: boolean | null;
  partySize?: number;
  companions?: Companion[];
  source: RequestSource;
  ownWords?: string;
  contacts: ContactMethods;
  /** The token from a "no_match" result, linking Jev's weak guess (or its absence) to this Request. */
  matchToken?: string;
};
export type RequestProblem = "name_required" | "contact_required" | CompanionProblem;
/** Someone not on the Guest list, asking to be invited. Never counted in the headcount. */
export type Request = {
  id: number;
  createdAt: string;
  name: string;
  attending: boolean | null;
  partySize: number;
  companions: Companion[];
  source: RequestSource;
  ownWords: string;
  contacts: Required<ContactMethods>;
  /** Jev's closest Guest when it was too unsure to place them, or null. */
  guess: WeakGuess | null;
  /** Jev could not be reached when this person replied. */
  jevUnavailable: boolean;
};
export type CurrentReply = {
  attending: boolean;
  partySize: number;
  companions: Companion[];
  /** The partner who answered for this Guest, when the Guest has not replied themselves since. */
  answeredBy: string | null;
};

/**
 * A Reply that says coming with Party size n needs exactly n-1 named Companions, each adult or child.
 * A Reply that says not coming takes none (anything sent is dropped, and Party size is 1).
 */
function normalizeParty(r: { attending: boolean; partySize: number; companions?: Companion[] }):
  | { ok: true; partySize: number; companions: Companion[] }
  | { ok: false; problem: CompanionProblem } {
  if (!r.attending) return { ok: true, partySize: 1, companions: [] };
  const given = r.companions ?? [];
  if (given.length !== r.partySize - 1) return { ok: false, problem: "companion_count" };
  const companions: Companion[] = [];
  for (const c of given) {
    const name = typeof c?.name === "string" ? c.name.trim().slice(0, 100) : "";
    if (!name || (c.kind !== "adult" && c.kind !== "child")) return { ok: false, problem: "companion_incomplete" };
    companions.push({ name, kind: c.kind });
  }
  return { ok: true, partySize: r.partySize, companions };
}

/** Children from untrusted input: names trimmed and optional, labels optional; at most MAX_PARTY_SIZE of them. */
function normalizeChildren(given: Child[] | null | undefined): { ok: true; children: Child[] | null } | { ok: false; problem: ChildrenProblem } {
  if (given === null || given === undefined) return { ok: true, children: null };
  if (!Array.isArray(given) || given.length > MAX_PARTY_SIZE) return { ok: false, problem: "children_count" };
  return {
    ok: true,
    children: given.map((c) => ({
      name: typeof c?.name === "string" ? c.name.trim().slice(0, 100) : "",
      kind: c?.kind === "adult" || c?.kind === "child" ? c.kind : null,
    })),
  };
}

export type Household = { partnerName: string | null; partnerComing: boolean; hasChildren: boolean; children: Child[] | null };

export type Reply = {
  id: number;
  createdAt: string;
  name: string;
  relation: string;
  attending: boolean;
  /** The replier and their Companions; a household's children are kept apart, in `children`. */
  partySize: number;
  companions: Companion[];
  /** The household's children, as this Reply stated them, or null when it did not answer "And your children?". */
  children: Child[] | null;
  confidence: number | null;
  suggestedGuestId: string | null;
  suggestedGuestName: string;
  /** Optional "how can we reach you" text the visitor added after a review outcome. Host only. */
  reviewContact: string;
};

/** The reply that counts for one guest (or for one person the host welcomed by name). */
export type Entry = {
  reply: Reply;
  key: string;
  name: string;
  by: "jev" | "assigned" | "new";
  replyCount: number;
  /** The name of the partner who said this Guest is coming with them, or null when the Guest replied themselves. */
  answeredBy: string | null;
  /** How many people this entry adds to the headcount: the Reply's Party size plus `children`. */
  partySize: number;
  /**
   * The household's children counted on this entry, [] when the household said none are coming, or null when they are
   * not counted here. A household's children are counted on one entry only.
   */
  children: Child[] | null;
};

export type Summary = {
  guests: Guest[];
  coming: Entry[];
  declined: Entry[];
  noReply: Guest[];
  review: Reply[];
  dismissed: Reply[];
  headcount: number;
  /** Of the headcount: Companions marked child are children; everyone else (including older Replies) is an adult. */
  adults: number;
  children: number;
  totalReplies: number;
};

type Row = {
  id: number;
  created_at: string;
  name: string;
  relation: string;
  attending: number;
  party_size: number;
  companions: string | null;
  children: string | null;
  matched_guest_id: string | null;
  confidence: number | null;
  status: "matched" | "review" | "unmatched";
  decision: "assigned" | "new_guest" | "dismissed" | null;
  assigned_guest_id: string | null;
  new_guest_name: string | null;
  review_contact: string | null;
  answered_by_guest_id: string | null;
};

type Guests = {
  list(opts?: { includeArchived?: boolean }): Promise<Guest[]>;
  add(input: GuestInput): Promise<Guest>;
};

function parseChildren(json: string | null): Child[] | null {
  if (json === null || json === undefined) return null;
  try {
    const list = JSON.parse(json);
    return Array.isArray(list) ? list : null;
  } catch {
    return null;
  }
}

function parseCompanions(json: string | null): Companion[] {
  try {
    const list = json ? JSON.parse(json) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

type Decision =
  | { status: "matched" | "review"; guestId: string; confidence: number }
  | { status: "unmatched"; guess: { guestId: string; confidence: number } | null };

function decide(answer: JevAnswer): Decision {
  const { picked, probabilities: probs } = answer;
  const confidence = probs[picked] ?? 0;
  if (picked !== "none" && confidence >= CONFIRM_THRESHOLD) return { status: "matched", guestId: picked, confidence };
  if (picked !== "none" && confidence >= REVIEW_THRESHOLD) return { status: "review", guestId: picked, confidence };
  // Too unsure (or "nobody"): no Match. Keep the closest Guest as a weak guess for the Host.
  const [bestId, bestP] =
    Object.entries(probs)
      .filter(([id]) => id !== "none")
      .sort((a, b) => b[1] - a[1])[0] ?? [];
  return { status: "unmatched", guess: bestId ? { guestId: bestId, confidence: bestP } : null };
}

/**
 * A household's children are counted once. Of the household's current Replies that say coming and answered
 * "And your children?", the newest one (by when it was sent) counts, including an answer of none; the children on the
 * partner's Reply are left out. A Guest without a partner is a household of one.
 */
function countChildrenOncePerHousehold(entries: Entry[], guests: Guest[]): Entry[] {
  const partnerOf = new Map(guests.map((g) => [g.id, g.partnerId]));
  const householdOf = (key: string) => [key, partnerOf.get(key) ?? key].sort().join("+");
  const counted = new Map<string, number>(); // household to the id of the Reply whose children count
  for (const e of entries) {
    if (!e.reply.attending || e.reply.children === null) continue;
    const h = householdOf(e.key);
    if ((counted.get(h) ?? -1) < e.reply.id) counted.set(h, e.reply.id);
  }
  return entries.map((e) => {
    if (e.children === null || counted.get(householdOf(e.key)) === e.reply.id) return e;
    return { ...e, children: null, partySize: e.partySize - e.children.length };
  });
}

const newToken = () => randomBytes(16).toString("hex");

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

  /** The Guest's linked partner, if there is one and they are not archived. */
  async function activePartner(guest: Guest): Promise<Guest | null> {
    if (!guest.partnerId) return null;
    return (await deps.guests.list()).find((g) => g.id === guest.partnerId) ?? null;
  }

  /** The Reply that currently counts for a Guest, if any. */
  async function currentEntry(guestId: string): Promise<Entry | null> {
    const { coming, declined } = await store.summary();
    return [...coming, ...declined].find((e) => e.key === guestId) ?? null;
  }

  async function repliesOpen(): Promise<boolean> {
    if (!deps.event) return true;
    return !replyDeadlinePassed(await deps.event.get(), (deps.now ?? (() => new Date()))());
  }

  /** Jev Matches a typed identity to a Guest; saves a confirmed or review Reply, or nothing when nobody matches. */
  async function matchAndRecord(reply: SharedReply): Promise<SubmitResult> {
    if (!(await repliesOpen())) return { outcome: "closed" };
    const party = normalizeParty(reply);
    if (!party.ok) return { outcome: party.problem };
    const guestList = await deps.guests.list();
    let match: Decision;
    let jevUnavailable = false;
    try {
      match = decide(await deps.jev(reply, guestList));
    } catch (err) {
      // If Jev is unreachable we cannot tell who this is: treat it as no match and tell the Host on the Request.
      console.error("Jev match failed", err);
      jevUnavailable = true;
      match = { status: "unmatched", guess: null };
    }
    await ensure();
    // Too unsure: nothing is saved as a Reply. The visitor is asked for their details, which become a Request.
    if (match.status === "unmatched") {
      const token = newToken();
      const guest = match.guess && guestList.find((g) => g.id === match.guess!.guestId);
      await db.execute({
        sql: `INSERT INTO match_guesses (token, guest_id, guest_name, confidence, jev_unavailable) VALUES (?, ?, ?, ?, ?)`,
        args: [token, guest ? guest.id : null, guest ? guest.name : null, guest && match.guess ? match.guess.confidence : null, jevUnavailable ? 1 : 0],
      });
      // Old guesses that never became a Request are not kept.
      await db.execute("DELETE FROM match_guesses WHERE created_at < datetime('now', '-7 days')");
      return { outcome: "no_match", token };
    }
    const token = match.status === "review" ? newToken() : null;
    await db.execute({
      sql: `INSERT INTO rsvps (name, relation, attending, party_size, companions, matched_guest_id, confidence, status, contact_token)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        reply.name,
        reply.relation,
        reply.attending ? 1 : 0,
        party.partySize,
        JSON.stringify(party.companions),
        match.guestId,
        match.confidence,
        match.status,
        token,
      ],
    });
    return match.status === "matched" ? { outcome: "confirmed" } : { outcome: "review", token: token! };
  }

  const store = {
    /** Whether Replies can still be sent or changed (the admin is never restricted). */
    repliesOpen,

    /** A reply sent through the Shared link: Jev tries to match it to a guest. */
    async submitShared(reply: SharedReply): Promise<SubmitResult> {
      return matchAndRecord(reply);
    },

    /**
     * "Not [name]?" on a Personal link: the person says who they are and goes through the same Matching and
     * outcomes as the Shared link. The code only has to be a live link; a Match to any Guest (even a different one)
     * records the Reply for that Guest, and the Reply of the Guest the link was made for is never touched.
     */
    async submitFromPersonalLink(
      code: string,
      reply: SharedReply,
    ): Promise<{ outcome: SubmitOutcome | "unknown_link" | "no_longer_available"; token?: string }> {
      const owner = await this.guestForPersonalLink(code);
      if (!owner) return { outcome: "unknown_link" };
      if (owner.archived) return { outcome: "no_longer_available" };
      return matchAndRecord(reply);
    },

    /** Someone not on the Guest list leaves their details. Needs a name and at least one way to reach them. */
    async submitRequest(input: RequestInput): Promise<"recorded" | RequestProblem> {
      const name = input.name.trim().slice(0, 100);
      if (!name) return "name_required";
      const clip = (v: string | undefined) => (v ?? "").trim().slice(0, 200);
      const c = input.contacts ?? {};
      const contacts = { phone: clip(c.phone), email: clip(c.email), whatsapp: clip(c.whatsapp), messenger: clip(c.messenger), other: clip(c.other) };
      if (!Object.values(contacts).some(Boolean)) return "contact_required";
      const attending = input.attending ?? null;
      const party = normalizeParty({ attending: attending === true, partySize: input.partySize ?? 1, companions: input.companions });
      if (!party.ok) return party.problem;
      await ensure();
      // Jev's weak guess for this visitor, claimed so one token makes one Request.
      const guessRow = input.matchToken
        ? (await db.execute({ sql: "DELETE FROM match_guesses WHERE token = ? RETURNING *", args: [input.matchToken] })).rows[0]
        : undefined;
      await db.execute({
        sql: `INSERT INTO requests (name, attending, party_size, companions, source, own_words, phone, email, whatsapp, messenger, other_contact,
                                    guess_guest_id, guess_guest_name, guess_confidence, jev_unavailable)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          name,
          attending === null ? null : attending ? 1 : 0,
          party.partySize,
          JSON.stringify(party.companions),
          input.source,
          (input.ownWords ?? "").trim().slice(0, 1000),
          contacts.phone,
          contacts.email,
          contacts.whatsapp,
          contacts.messenger,
          contacts.other,
          guessRow?.guest_id ?? null,
          guessRow?.guest_name ?? null,
          guessRow?.confidence ?? null,
          guessRow && Number(guessRow.jev_unavailable) ? 1 : 0,
        ],
      });
      return "recorded";
    },

    /** Every Request, newest first. */
    async listRequests(): Promise<Request[]> {
      await ensure();
      const rows = (await db.execute("SELECT * FROM requests ORDER BY id DESC")).rows;
      return rows.map((r) => ({
        id: Number(r.id),
        createdAt: String(r.created_at),
        name: String(r.name),
        attending: r.attending === null ? null : !!r.attending,
        partySize: Number(r.party_size),
        companions: parseCompanions(String(r.companions)),
        source: String(r.source) as RequestSource,
        ownWords: String(r.own_words),
        contacts: {
          phone: String(r.phone),
          email: String(r.email),
          whatsapp: String(r.whatsapp),
          messenger: String(r.messenger),
          other: String(r.other_contact),
        },
        guess:
          r.guess_guest_id === null || r.guess_guest_id === undefined
            ? null
            : { guestId: String(r.guess_guest_id), guestName: String(r.guess_guest_name), confidence: Number(r.guess_confidence) },
        jevUnavailable: !!Number(r.jev_unavailable ?? 0),
      }));
    },

    /**
     * After a "review" outcome the visitor may say how the Host can reach them if a check is needed. Only the holder of
     * the token that came back with their Reply can attach it; it is shown to the Host in the review panel and nowhere else.
     */
    async attachReviewContact(token: string, contact: string): Promise<"saved" | "not_found"> {
      if (!token) return "not_found";
      await ensure();
      const done = await db.execute({
        sql: "UPDATE rsvps SET review_contact = ? WHERE contact_token = ?",
        args: [contact.trim().slice(0, 500), token],
      });
      return done.rowsAffected > 0 ? "saved" : "not_found";
    },

    /** The Guest a Personal link was made for (archived Guests included, see `archived`), or null for an unknown code. */
    async guestForPersonalLink(code: string): Promise<Guest | null> {
      if (!code) return null;
      const all = await deps.guests.list({ includeArchived: true });
      return all.find((g) => g.personalLinkCode === code) ?? null;
    },

    /** A Reply through a Personal link: the code says who is replying, so no Match is needed. */
    async submitPersonal(
      code: string,
      reply: PersonalReply,
    ): Promise<"recorded" | "unknown_link" | "no_longer_available" | "closed" | CompanionProblem | ChildrenProblem> {
      const guest = await this.guestForPersonalLink(code);
      if (!guest) return "unknown_link";
      if (guest.archived) return "no_longer_available";
      if (!(await this.repliesOpen())) return "closed";
      const party = normalizeParty(reply);
      if (!party.ok) return party.problem;
      const partner = reply.attending ? await activePartner(guest) : null;
      // "And your children?" is only asked of a coming Guest whose household is marked as having children.
      const asked = reply.attending && (guest.hasChildren || !!partner?.hasChildren);
      const kids = normalizeChildren(asked ? reply.children : null);
      if (!kids.ok) return kids.problem;
      await ensure();
      const statements: InStatement[] = [
        {
          sql: `INSERT INTO rsvps (name, relation, attending, party_size, companions, children, matched_guest_id, confidence, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'matched')`,
          args: [
            guest.name,
            "Personal link",
            reply.attending ? 1 : 0,
            party.partySize,
            JSON.stringify(party.companions),
            kids.children ? JSON.stringify(kids.children) : null,
            guest.id,
          ],
        },
      ];
      // Coming with their partner: the partner is recorded as coming too, unless they already are (which keeps their own
      // Party size and Companions). An archived partner is never recorded.
      if (partner && reply.withPartner && !(await currentEntry(partner.id))?.reply.attending) {
        statements.push({
          sql: `INSERT INTO rsvps (name, relation, attending, party_size, companions, matched_guest_id, confidence, status, answered_by_guest_id)
                VALUES (?, 'Answered by partner', 1, 1, '[]', ?, 1, 'matched', ?)`,
          args: [partner.name, partner.id, guest.id],
        });
      }
      await db.batch(statements, "write");
      return "recorded";
    },

    /** The Reply that currently counts for the Guest behind a Personal link, or null if none yet (or unknown link). */
    async currentForPersonalLink(code: string): Promise<CurrentReply | null> {
      const guest = await this.guestForPersonalLink(code);
      if (!guest) return null;
      const entry = await currentEntry(guest.id);
      return entry
        ? { attending: entry.reply.attending, partySize: entry.reply.partySize, companions: entry.reply.companions, answeredBy: entry.answeredBy }
        : null;
    },

    /**
     * What the Invitation page needs to ask a household's questions: the Guest's active partner (if any) and whether
     * they are currently coming, whether the household is marked as having children, and the household's children as
     * currently counted (null when no coming Reply has answered about them). Null for an unknown link.
     */
    async householdForPersonalLink(code: string): Promise<Household | null> {
      const guest = await this.guestForPersonalLink(code);
      if (!guest) return null;
      const partner = await activePartner(guest);
      const { coming } = await this.summary();
      const ours = coming.filter((e) => e.key === guest.id || e.key === partner?.id);
      return {
        partnerName: partner?.name ?? null,
        partnerComing: !!partner && ours.some((e) => e.key === partner.id),
        hasChildren: guest.hasChildren || !!partner?.hasChildren,
        children: ours.find((e) => e.children !== null)?.children ?? null,
      };
    },

    async assignToGuest(id: number, guestId: string) {
      if (!(await deps.guests.list()).some((g) => g.id === guestId)) throw new Error("Unknown guest");
      await setDecision(id, "decision='assigned', assigned_guest_id=?, new_guest_name=NULL", [guestId]);
    },

    /**
     * Accept request: a Reply in review that is from someone not on the list becomes a real Guest
     * (with a Personal link, in the language the Host picks), and this Reply counts for them.
     */
    async acceptReviewAsGuest(id: number, name: string, language: Language) {
      const guest = await deps.guests.add({ name, language, notes: "" });
      await setDecision(id, "decision='assigned', assigned_guest_id=?, new_guest_name=NULL", [guest.id]);
    },

    /**
     * Accept a Request: the person becomes a Guest in the chosen language, the Reply that came with the Request
     * (answer, Party size, Companions) becomes their current Reply, and the Request is removed.
     */
    async acceptRequest(id: number, language: Language): Promise<"accepted" | "not_found"> {
      await ensure();
      // Removing the row first claims it, so a double submit cannot make two Guests.
      const gone = await db.execute({ sql: "DELETE FROM requests WHERE id = ? RETURNING *", args: [id] });
      const r = gone.rows[0];
      if (!r) return "not_found";
      const guest = await deps.guests.add({ name: String(r.name), language, notes: "" });
      if (r.attending !== null) {
        await db.execute({
          sql: `INSERT INTO rsvps (name, relation, attending, party_size, companions, matched_guest_id, confidence, status)
                VALUES (?, 'Request', ?, ?, ?, ?, 1, 'matched')`,
          args: [guest.name, Number(r.attending) ? 1 : 0, Number(r.party_size), String(r.companions), guest.id],
        });
      }
      return "accepted";
    },

    /**
     * "This is an existing Guest": the Request's Reply (answer, Party size, Companions) becomes the current Reply of an
     * active Guest the Host picked, and the Request is removed. No new Guest is made.
     */
    async assignRequestToGuest(id: number, guestId: string): Promise<"assigned" | "not_found" | "unknown_guest"> {
      await ensure();
      const guest = (await deps.guests.list()).find((g) => g.id === guestId);
      if (!guest) return "unknown_guest";
      const gone = await db.execute({ sql: "DELETE FROM requests WHERE id = ? RETURNING *", args: [id] });
      const r = gone.rows[0];
      if (!r) return "not_found";
      if (r.attending !== null) {
        await db.execute({
          sql: `INSERT INTO rsvps (name, relation, attending, party_size, companions, matched_guest_id, confidence, status)
                VALUES (?, 'Request', ?, ?, ?, ?, 1, 'matched')`,
          args: [guest.name, Number(r.attending) ? 1 : 0, Number(r.party_size), String(r.companions), guest.id],
        });
      }
      return "assigned";
    },

    /** Decline a Request: it is removed, with no Guest and nothing counted. */
    async declineRequest(id: number): Promise<"declined" | "not_found"> {
      await ensure();
      const gone = await db.execute({ sql: "DELETE FROM requests WHERE id = ?", args: [id] });
      return gone.rowsAffected > 0 ? "declined" : "not_found";
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
        companions: parseCompanions(r.companions),
        children: parseChildren(r.children),
        confidence: r.confidence,
        suggestedGuestId: r.status === "review" ? r.matched_guest_id : null,
        suggestedGuestName: nameOf(r.status === "review" ? r.matched_guest_id : null),
        reviewContact: r.review_contact ?? "",
      });

      // Apply the host's decisions on top of Jev's matches (oldest first, so the latest reply wins).
      const latest = new Map<string, Entry>();
      const review: Reply[] = [];
      const dismissed: Reply[] = [];
      for (const r of [...rows].reverse()) {
        let eff: Pick<Entry, "reply" | "key" | "name" | "by"> | null = null;
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
        latest.set(eff.key, {
          ...eff,
          replyCount: (latest.get(eff.key)?.replyCount ?? 0) + 1,
          answeredBy: r.answered_by_guest_id ? nameOf(r.answered_by_guest_id) : null,
          partySize: reply.partySize + (reply.children?.length ?? 0),
          children: reply.children,
        });
      }

      const newestFirst = (a: { id: number }, b: { id: number }) => b.id - a.id;
      const byNewest = (a: Entry, b: Entry) => newestFirst(a.reply, b.reply);
      review.sort(newestFirst);
      dismissed.sort(newestFirst);
      const entries = countChildrenOncePerHousehold([...latest.values()], allGuests);
      const coming = entries.filter((e) => e.reply.attending).sort(byNewest);
      const headcount = coming.reduce((n, e) => n + e.partySize, 0);
      const children = coming.reduce(
        (n, e) => n + e.reply.companions.filter((c) => c.kind === "child").length + (e.children ?? []).filter((c) => c.kind !== "adult").length,
        0,
      );
      return {
        guests,
        coming,
        declined: entries.filter((e) => !e.reply.attending).sort(byNewest),
        noReply: guests.filter((g) => !latest.has(g.id)),
        review,
        dismissed,
        headcount,
        adults: headcount - children,
        children,
        totalReplies: rows.length,
      };
    },
  };
  return store;
}
