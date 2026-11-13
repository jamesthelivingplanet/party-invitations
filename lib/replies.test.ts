import { expect, test } from "vitest";
import { testDb } from "@/test/db";
import { createEventStore } from "./event";
import { createGuestStore, type Guest } from "./guests";
import { createReplyStore, type JevAnswer, type Jev, type RequestInput, type SharedReply } from "./replies";

/** A scripted Jev: answers by the name typed in the reply. Unscripted names get "nobody". */
function scriptedJev(script: Record<string, JevAnswer>): Jev {
  return async (input) => script[input.name] ?? { picked: "none", probabilities: { none: 0.9 } };
}

/** A Jev that is down: nobody can be Matched, so every Shared-link Reply is "no match". */
const jevDown: Jev = async () => {
  throw new Error("down");
};

/** A Jev that is middling-sure about the first Guest on the list, so every Reply waits for the Host's review. */
const middling: Jev = async (_input, offered) =>
  offered[0]
    ? { picked: offered[0].id, probabilities: { [offered[0].id]: 0.6, none: 0.4 } }
    : { picked: "none", probabilities: { none: 0.9 } };

async function setup(script: Record<string, JevAnswer> = {}, jev: Jev = scriptedJev(script)) {
  const db = testDb();
  const guests = createGuestStore(db);
  const replies = createReplyStore(db, { guests, jev });
  return { guests, replies };
}

/** A Party size of n with n-1 adult Companions. */
function party(n: number) {
  return { partySize: n, companions: Array.from({ length: n - 1 }, (_, i) => ({ name: `Guest ${i + 2}`, kind: "adult" as const })) };
}

const sure = (g: Guest): JevAnswer => ({ picked: g.id, probabilities: { [g.id]: 0.95, none: 0.05 } });
const unsure = (g: Guest): JevAnswer => ({ picked: g.id, probabilities: { [g.id]: 0.6, none: 0.4 } });

const shared = (name: string, over: Partial<SharedReply> = {}) => ({
  name,
  relation: "a friend",
  attending: true,
  partySize: 1,
  ...over,
});

test("a confident match is confirmed and shows the guest as coming", async () => {
  const db = testDb();
  const g = createGuestStore(db);
  const s = await g.add({ name: "Sarah Johnson", language: "en", notes: "" });
  const store = createReplyStore(db, { guests: g, jev: scriptedJev({ Sarah: sure(s) }) });

  const { outcome } = await store.submitShared(shared("Sarah", { ...party(3) }));

  expect(outcome).toBe("confirmed");
  const summary = await store.summary();
  expect(summary.coming.map((e) => e.name)).toEqual(["Sarah Johnson"]);
  expect(summary.headcount).toBe(3);
  expect(summary.noReply).toEqual([]);
});

test("a middling match waits for review with the guessed guest", async () => {
  const db = testDb();
  const g = createGuestStore(db);
  const s = await g.add({ name: "Sarah Johnson", language: "en", notes: "" });
  const store = createReplyStore(db, { guests: g, jev: scriptedJev({ Sarah: unsure(s) }) });

  expect((await store.submitShared(shared("Sarah"))).outcome).toBe("review");

  const { review, coming, noReply } = await store.summary();
  expect(coming).toEqual([]);
  expect(noReply.map((x) => x.name)).toEqual(["Sarah Johnson"]);
  expect(review).toHaveLength(1);
  expect(review[0]).toMatchObject({ suggestedGuestId: s.id, suggestedGuestName: "Sarah Johnson" });
});

test("a 'nobody' answer with a plausible runner-up is no match, never review", async () => {
  const db = testDb();
  const g = createGuestStore(db);
  const s = await g.add({ name: "Sarah Johnson", language: "en", notes: "" });
  const store = createReplyStore(db, {
    guests: g,
    jev: scriptedJev({ Sara: { picked: "none", probabilities: { none: 0.7, [s.id]: 0.2 } } }),
  });

  expect((await store.submitShared(shared("Sara"))).outcome).toBe("no_match");

  expect((await store.summary()).review).toEqual([]);
  expect((await store.summary()).totalReplies).toBe(0);
});

test("a weak match just under the review threshold is no match, and the Request keeps Jev's guess for the Host", async () => {
  const db = testDb();
  const g = createGuestStore(db);
  const s = await g.add({ name: "Michael Johnson", language: "en", notes: "" });
  const store = createReplyStore(db, {
    guests: g,
    jev: scriptedJev({ Plants: { picked: s.id, probabilities: { [s.id]: 0.35, none: 0.65 } } }),
  });

  const { outcome, token } = await store.submitShared(shared("Plants", { relation: "From school" }));

  expect(outcome).toBe("no_match");
  expect((await store.summary()).review).toEqual([]);
  expect(await store.listRequests()).toEqual([]);

  expect(await store.submitRequest({ name: "Plants", source: "shared", contacts: { phone: "555" }, matchToken: token })).toBe("recorded");
  const [r] = await store.listRequests();
  expect(r.guess).toEqual({ guestId: s.id, guestName: "Michael Johnson", confidence: 0.35 });
  expect(r.jevUnavailable).toBe(false);
});

test("a guess token makes one Request, and a made-up token adds nothing", async () => {
  const db = testDb();
  const g = createGuestStore(db);
  const s = await g.add({ name: "Michael Johnson", language: "en", notes: "" });
  const store = createReplyStore(db, {
    guests: g,
    jev: scriptedJev({ Plants: { picked: s.id, probabilities: { [s.id]: 0.35, none: 0.65 } } }),
  });
  const { token } = await store.submitShared(shared("Plants"));

  await store.submitRequest({ name: "A", source: "shared", contacts: { phone: "1" }, matchToken: token });
  await store.submitRequest({ name: "B", source: "shared", contacts: { phone: "1" }, matchToken: token });
  await store.submitRequest({ name: "C", source: "shared", contacts: { phone: "1" }, matchToken: "made-up" });

  const byName = Object.fromEntries((await store.listRequests()).map((r) => [r.name, r.guess]));
  expect(byName.A).toMatchObject({ guestName: "Michael Johnson" });
  expect(byName.B).toBeNull();
  expect(byName.C).toBeNull();
});

test("a 'nobody' answer with no runner-up is no match with no guess", async () => {
  const db = testDb();
  const g = createGuestStore(db);
  await g.add({ name: "Sarah Johnson", language: "en", notes: "" });
  const store = createReplyStore(db, { guests: g, jev: scriptedJev({}) });

  const { outcome, token } = await store.submitShared(shared("Stranger"));

  expect(outcome).toBe("no_match");
  expect((await store.summary()).review).toEqual([]);
  expect(await store.listRequests()).toEqual([]);
  await store.submitRequest({ name: "Stranger", source: "shared", contacts: { phone: "1" }, matchToken: token });
  expect((await store.listRequests())[0].guess).toBeNull();
});

test("archived guests are never offered as matches", async () => {
  const db = testDb();
  const g = createGuestStore(db);
  const sarah = await g.add({ name: "Sarah Johnson", language: "en", notes: "" });
  await g.archive(sarah.id);
  // This Jev can only pick a guest it was shown.
  const jev: Jev = async (input, offered) => {
    const hit = offered.find((o) => o.name.startsWith(input.name));
    return hit
      ? { picked: hit.id, probabilities: { [hit.id]: 0.99 } }
      : { picked: "none", probabilities: { none: 0.99 } };
  };
  const store = createReplyStore(db, { guests: g, jev });

  expect((await store.submitShared(shared("Sarah"))).outcome).toBe("no_match");
});

test("when Jev is unreachable it is no match, nothing goes to review, and the Request says Jev was unavailable", async () => {
  const { replies } = await setup({}, jevDown);

  const { outcome, token } = await replies.submitShared(shared("Sarah"));

  expect(outcome).toBe("no_match");
  expect((await replies.summary()).review).toEqual([]);
  await replies.submitRequest({ name: "Sarah", source: "shared", contacts: { phone: "1" }, matchToken: token });
  expect((await replies.listRequests())[0]).toMatchObject({ jevUnavailable: true, guess: null });
});

test("a middling match gives the visitor a token to attach optional contact details, shown only on the review item", async () => {
  const { guests, replies } = await setup({}, middling);
  await guests.add({ name: "Sarah Johnson", language: "en", notes: "" });
  const mine = await replies.submitShared(shared("Sarah"));
  const other = await replies.submitShared(shared("Sara"));
  expect(mine.outcome).toBe("review");
  expect(mine.token).toBeTruthy();
  expect(mine.token).not.toBe(other.token);

  expect(await replies.attachReviewContact(mine.token!, "  555-0100 or sarah@example.com ")).toBe("saved");

  const review = (await replies.summary()).review;
  expect(review.find((r) => r.name === "Sarah")?.reviewContact).toBe("555-0100 or sarah@example.com");
  expect(review.find((r) => r.name === "Sara")?.reviewContact).toBe("");
});

test("contact details cannot be attached without the visitor's token", async () => {
  const { guests, replies } = await setup({}, middling);
  await guests.add({ name: "Sarah Johnson", language: "en", notes: "" });
  await replies.submitShared(shared("Sarah"));

  expect(await replies.attachReviewContact("", "x")).toBe("not_found");
  expect(await replies.attachReviewContact("1", "x")).toBe("not_found");
  expect((await replies.summary()).review[0].reviewContact).toBe("");
});

test("a confident match gives no token", async () => {
  const db = testDb();
  const g = createGuestStore(db);
  const s = await g.add({ name: "Sarah Johnson", language: "en", notes: "" });
  const store = createReplyStore(db, { guests: g, jev: scriptedJev({ Sarah: sure(s) }) });
  expect((await store.submitShared(shared("Sarah"))).token).toBeUndefined();
});

test("a guest's latest reply is the one that counts", async () => {
  const db = testDb();
  const g = createGuestStore(db);
  const s = await g.add({ name: "Sarah Johnson", language: "en", notes: "" });
  const store = createReplyStore(db, { guests: g, jev: scriptedJev({ Sarah: sure(s) }) });

  await store.submitShared(shared("Sarah", { attending: true, ...party(4) }));
  await store.submitShared(shared("Sarah", { attending: false }));

  const summary = await store.summary();
  expect(summary.coming).toEqual([]);
  expect(summary.declined.map((e) => e.name)).toEqual(["Sarah Johnson"]);
  expect(summary.declined[0].replyCount).toBe(2);
  expect(summary.headcount).toBe(0);
});

test("an archived guest's replies are left out, and come back when they are restored", async () => {
  const db = testDb();
  const g = createGuestStore(db);
  const s = await g.add({ name: "Sarah Johnson", language: "en", notes: "" });
  const store = createReplyStore(db, { guests: g, jev: scriptedJev({ Sarah: sure(s) }) });
  await store.submitShared(shared("Sarah", { ...party(2) }));

  await g.archive(s.id);
  const hidden = await store.summary();
  expect(hidden.coming).toEqual([]);
  expect(hidden.headcount).toBe(0);
  expect(hidden.noReply).toEqual([]);

  await g.restore(s.id);
  const back = await store.summary();
  expect(back.coming.map((e) => e.name)).toEqual(["Sarah Johnson"]);
  expect(back.headcount).toBe(2);
});

test("the host can confirm a reviewed reply as the suggested guest, and undo it", async () => {
  const db = testDb();
  const g = createGuestStore(db);
  const s = await g.add({ name: "Sarah Johnson", language: "en", notes: "" });
  const store = createReplyStore(db, { guests: g, jev: scriptedJev({ Sarah: unsure(s) }) });
  await store.submitShared(shared("Sarah", { ...party(2) }));
  const [pending] = (await store.summary()).review;

  await store.assignToGuest(pending.id, s.id);

  let summary = await store.summary();
  expect(summary.review).toEqual([]);
  expect(summary.coming[0]).toMatchObject({ name: "Sarah Johnson", by: "assigned" });
  expect(summary.headcount).toBe(2);

  await store.undo(pending.id);

  summary = await store.summary();
  expect(summary.coming).toEqual([]);
  expect(summary.review).toHaveLength(1);
});

test("the host can assign a reply to a different guest", async () => {
  const db = testDb();
  const g = createGuestStore(db);
  await g.add({ name: "Sarah Johnson", language: "en", notes: "" });
  const dave = await g.add({ name: "Dave Example", language: "en", notes: "" });
  const store = createReplyStore(db, { guests: g, jev: middling });
  await store.submitShared(shared("Dad"));
  const [pending] = (await store.summary()).review;

  await store.assignToGuest(pending.id, dave.id);

  expect((await store.summary()).coming.map((e) => e.name)).toEqual(["Dave Example"]);
});

test("assigning to an unknown guest is refused", async () => {
  const { guests, replies } = await setup({}, middling);
  await guests.add({ name: "Sarah Johnson", language: "en", notes: "" });
  await replies.submitShared(shared("Dad"));
  const [pending] = (await replies.summary()).review;

  await expect(replies.assignToGuest(pending.id, "gst_nope")).rejects.toThrow();
});

test("marking a reply not invited sets it aside, and it can be brought back", async () => {
  const { guests, replies } = await setup({}, middling);
  await guests.add({ name: "Sarah Johnson", language: "en", notes: "" });
  await replies.submitShared(shared("Stranger"));
  const [pending] = (await replies.summary()).review;

  await replies.markNotInvited(pending.id);

  let summary = await replies.summary();
  expect(summary.review).toEqual([]);
  expect(summary.dismissed.map((r) => r.name)).toEqual(["Stranger"]);

  await replies.undo(pending.id);

  summary = await replies.summary();
  expect(summary.dismissed).toEqual([]);
  expect(summary.review).toHaveLength(1);
});

test("accepting a review item as a request makes a real Guest in the chosen language and counts the Reply", async () => {
  const { guests, replies } = await setup({}, middling);
  await guests.add({ name: "Sarah Johnson", language: "en", notes: "" });
  await replies.submitShared(shared("Stranger", { ...party(2) }));
  const [pending] = (await replies.summary()).review;

  await replies.acceptReviewAsGuest(pending.id, "Pat Newcomer", "es");

  const summary = await replies.summary();
  expect(summary.review).toEqual([]);
  expect(summary.coming[0]).toMatchObject({ name: "Pat Newcomer", by: "assigned" });
  expect(summary.headcount).toBe(2);
  const guest = (await guests.list()).find((x) => x.name === "Pat Newcomer")!;
  expect(guest).toMatchObject({ name: "Pat Newcomer", language: "es" });
  expect(guest.personalLinkCode).toBeTruthy();
  await expect(replies.acceptReviewAsGuest(pending.id, "  ", "en")).rejects.toThrow();
});

test("the summary counts every reply received, however it was sorted", async () => {
  const { guests, replies } = await setup({}, middling);
  await guests.add({ name: "Sarah Johnson", language: "en", notes: "" });
  await replies.submitShared(shared("A"));
  await replies.submitShared(shared("B"));

  expect((await replies.summary()).totalReplies).toBe(2);
});

test("a Reply through a valid Personal link is recorded for that Guest and shows in the summary", async () => {
  const { guests, replies } = await setup();
  await guests.add({ name: "Dave Example", language: "en", notes: "" });
  const sarah = await guests.add({ name: "Sarah Johnson", language: "es", notes: "" });

  const outcome = await replies.submitPersonal(sarah.personalLinkCode, { attending: true, ...party(3) });

  expect(outcome).toBe("recorded");
  const summary = await replies.summary();
  expect(summary.coming.map((e) => e.name)).toEqual(["Sarah Johnson"]);
  expect(summary.headcount).toBe(3);
  expect(summary.review).toEqual([]);
  expect(summary.noReply.map((g) => g.name)).toEqual(["Dave Example"]);
});

test("a Guest who says they are not coming shows as declined", async () => {
  const { guests, replies } = await setup();
  const sarah = await guests.add({ name: "Sarah Johnson", language: "en", notes: "" });

  await replies.submitPersonal(sarah.personalLinkCode, { attending: false, ...party(4) });

  const summary = await replies.summary();
  expect(summary.declined.map((e) => e.name)).toEqual(["Sarah Johnson"]);
  expect(summary.headcount).toBe(0);
});

test("an unknown Personal link code is rejected and records nothing", async () => {
  const { guests, replies } = await setup();
  await guests.add({ name: "Sarah Johnson", language: "en", notes: "" });

  expect(await replies.submitPersonal("not-a-real-code", { attending: true, ...party(2) })).toBe("unknown_link");

  const summary = await replies.summary();
  expect(summary.totalReplies).toBe(0);
  expect(summary.coming).toEqual([]);
});

test("a Personal link for an archived Guest accepts no Reply", async () => {
  const { guests, replies } = await setup();
  const sarah = await guests.add({ name: "Sarah Johnson", language: "en", notes: "" });
  await guests.archive(sarah.id);

  expect(await replies.submitPersonal(sarah.personalLinkCode, { attending: true, partySize: 1 })).toBe("no_longer_available");
  expect((await replies.summary()).totalReplies).toBe(0);

  await guests.restore(sarah.id);
  expect(await replies.submitPersonal(sarah.personalLinkCode, { attending: true, partySize: 1 })).toBe("recorded");
});

test("a regenerated Personal link makes the old code useless, records nothing for it, and keeps the Reply", async () => {
  const { guests, replies } = await setup();
  const sarah = await guests.add({ name: "Sarah Johnson", language: "en", notes: "" });
  await replies.submitPersonal(sarah.personalLinkCode, { attending: true, partySize: 2, companions: [{ name: "Tom", kind: "adult" }] });

  const fresh = await guests.regeneratePersonalLink(sarah.id);

  expect(fresh).not.toBe(sarah.personalLinkCode);
  expect(fresh).toMatch(/^[A-Za-z0-9_-]{22,}$/);
  expect(await replies.submitPersonal(sarah.personalLinkCode, { attending: false, partySize: 1 })).toBe("unknown_link");
  expect(await replies.guestForPersonalLink(sarah.personalLinkCode)).toBeNull();
  expect(await replies.guestForPersonalLink(fresh)).toMatchObject({ name: "Sarah Johnson" });
  const summary = await replies.summary();
  expect(summary.totalReplies).toBe(1);
  expect(summary.coming.map((e) => [e.name, e.reply.partySize])).toEqual([["Sarah Johnson", 2]]);
  expect(await replies.submitPersonal(fresh, { attending: true, ...party(3) })).toBe("recorded");
});

test("a Personal link finds its Guest, and says so when the Guest is archived", async () => {
  const { guests, replies } = await setup();
  const sarah = await guests.add({ name: "Sarah Johnson", language: "es", notes: "" });

  expect(await replies.guestForPersonalLink(sarah.personalLinkCode)).toMatchObject({ name: "Sarah Johnson", language: "es" });
  expect(await replies.guestForPersonalLink("nope")).toBeNull();
  await guests.archive(sarah.id);
  expect(await replies.guestForPersonalLink(sarah.personalLinkCode)).toMatchObject({ name: "Sarah Johnson", archived: true });
});

test("reopening a Personal link shows the Guest's current Reply, or nothing before they reply", async () => {
  const { guests, replies } = await setup();
  const sarah = await guests.add({ name: "Sarah Johnson", language: "en", notes: "" });

  expect(await replies.currentForPersonalLink(sarah.personalLinkCode)).toBeNull();
  await replies.submitPersonal(sarah.personalLinkCode, { attending: true, ...party(3) });
  expect(await replies.currentForPersonalLink(sarah.personalLinkCode)).toMatchObject({ attending: true, partySize: 3, companions: [adult("Guest 2"), adult("Guest 3")] });
  expect(await replies.currentForPersonalLink("nope")).toBeNull();
});

test("changing a Reply replaces the earlier one: counted once, latest answer", async () => {
  const { guests, replies } = await setup();
  const sarah = await guests.add({ name: "Sarah Johnson", language: "en", notes: "" });

  await replies.submitPersonal(sarah.personalLinkCode, { attending: true, ...party(4) });
  await replies.submitPersonal(sarah.personalLinkCode, { attending: true, ...party(2) });

  expect(await replies.currentForPersonalLink(sarah.personalLinkCode)).toMatchObject({ attending: true, ...party(2) });
  const summary = await replies.summary();
  expect(summary.coming.map((e) => e.name)).toEqual(["Sarah Johnson"]);
  expect(summary.headcount).toBe(2);
});

test("changing from coming to not coming removes the Guest from the headcount", async () => {
  const { guests, replies } = await setup();
  const sarah = await guests.add({ name: "Sarah Johnson", language: "en", notes: "" });

  await replies.submitPersonal(sarah.personalLinkCode, { attending: true, ...party(3) });
  await replies.submitPersonal(sarah.personalLinkCode, { attending: false, ...party(3) });

  expect(await replies.currentForPersonalLink(sarah.personalLinkCode)).toMatchObject({ attending: false, partySize: 1, companions: [] });
  const summary = await replies.summary();
  expect(summary.headcount).toBe(0);
  expect(summary.coming).toEqual([]);
  expect(summary.declined.map((e) => e.name)).toEqual(["Sarah Johnson"]);
});

// Reply deadline: event 2026-12-19 minus 7 days = 2026-12-12, closing at the end of that day in New York (UTC-5 in December).
async function withDeadline(days: number | null, nowIso: string, jev: Jev = scriptedJev({})) {
  const db = testDb();
  const guests = createGuestStore(db);
  const event = createEventStore(db);
  await event.update({ date: "2026-12-19", replyDeadlineDays: days, timeZone: "America/New_York" });
  const clock = { now: new Date(nowIso) };
  const replies = createReplyStore(db, { guests, jev, event, now: () => clock.now });
  const guest = await guests.add({ name: "Sarah Johnson", language: "en", notes: "" });
  return { replies, guest, guests, clock };
}
const tom = { name: "Tom", kind: "adult" as const };
const LAST_MOMENT = "2026-12-13T04:59:59.999Z"; // 23:59:59.999 on Dec 12 in New York
const FIRST_AFTER = "2026-12-13T05:00:00.000Z"; // 00:00:00 on Dec 13 in New York

test("a Personal link Reply is accepted at the last moment of the deadline day", async () => {
  const { replies, guest } = await withDeadline(7, LAST_MOMENT);

  expect(await replies.submitPersonal(guest.personalLinkCode, { attending: true, partySize: 2, companions: [tom] })).toBe("recorded");
  expect(await replies.repliesOpen()).toBe(true);
});

test("a Personal link Reply is refused from the first moment after the deadline day, and the earlier Reply stands", async () => {
  const { replies, guest, clock } = await withDeadline(7, LAST_MOMENT);
  await replies.submitPersonal(guest.personalLinkCode, { attending: true, partySize: 2, companions: [tom] });
  clock.now = new Date(FIRST_AFTER);

  expect(await replies.submitPersonal(guest.personalLinkCode, { attending: false, partySize: 1 })).toBe("closed");

  expect(await replies.repliesOpen()).toBe(false);
  expect(await replies.currentForPersonalLink(guest.personalLinkCode)).toMatchObject({ attending: true, partySize: 2, companions: [tom] });
});

test("a Shared link Reply is accepted on the last moment and refused after the deadline", async () => {
  const open = await withDeadline(7, LAST_MOMENT);
  expect((await open.replies.submitShared(shared("Anyone"))).outcome).not.toBe("closed");

  const closed = await withDeadline(7, FIRST_AFTER);
  expect((await closed.replies.submitShared(shared("Anyone"))).outcome).toBe("closed");
  expect((await closed.replies.summary()).totalReplies).toBe(0);
});

test("with no deadline set, Replies are always accepted", async () => {
  const { replies, guest } = await withDeadline(null, "2030-01-01T00:00:00Z");

  expect(await replies.repliesOpen()).toBe(true);
  expect(await replies.submitPersonal(guest.personalLinkCode, { attending: true, partySize: 1 })).toBe("recorded");
});

test("the Host can still assign a Reply after the deadline", async () => {
  const { replies, guests, clock } = await withDeadline(7, LAST_MOMENT, middling);
  const tom = await guests.add({ name: "Tom", language: "en", notes: "" });
  await replies.submitShared(shared("Unknown person"));
  const [pending] = (await replies.summary()).review;
  clock.now = new Date(FIRST_AFTER);

  await replies.assignToGuest(pending.id, tom.id);

  expect((await replies.summary()).coming.map((e) => e.name)).toEqual(["Tom"]);
});

const adult = (name: string) => ({ name, kind: "adult" as const });
const child = (name: string) => ({ name, kind: "child" as const });
type PersonalInput = Parameters<Awaited<ReturnType<typeof setup>>["replies"]["submitPersonal"]>[1];

test("a Party size above one takes exactly Party size minus one named Companions, each adult or child", async () => {
  const { guests, replies } = await setup();
  const sarah = await guests.add({ name: "Sarah Johnson", language: "en", notes: "" });
  const code = sarah.personalLinkCode;

  const companions = [adult("Tom"), child("Mia")];
  expect(await replies.submitPersonal(code, { attending: true, partySize: 3, companions })).toBe("recorded");

  expect(await replies.currentForPersonalLink(code)).toMatchObject({ attending: true, partySize: 3, companions });
  const summary = await replies.summary();
  expect(summary.coming[0].reply.companions).toEqual(companions);
  expect(summary.headcount).toBe(3);
  expect(summary.adults).toBe(2);
  expect(summary.children).toBe(1);
});

test("too few or too many Companions are refused and nothing is recorded", async () => {
  const { guests, replies } = await setup();
  const sarah = await guests.add({ name: "Sarah Johnson", language: "en", notes: "" });
  const code = sarah.personalLinkCode;

  expect(await replies.submitPersonal(code, { attending: true, partySize: 3, companions: [adult("Tom")] })).toBe("companion_count");
  expect(await replies.submitPersonal(code, { attending: true, partySize: 1, companions: [adult("Tom")] })).toBe("companion_count");
  expect(await replies.submitPersonal(code, { attending: true, partySize: 2 })).toBe("companion_count");
  expect((await replies.summary()).totalReplies).toBe(0);
});

test("every Companion needs a name and an adult or child label", async () => {
  const { guests, replies } = await setup();
  const sarah = await guests.add({ name: "Sarah Johnson", language: "en", notes: "" });
  const code = sarah.personalLinkCode;

  expect(await replies.submitPersonal(code, { attending: true, partySize: 2, companions: [adult("   ")] })).toBe("companion_incomplete");
  const noLabel = [{ name: "Tom" }] as unknown as PersonalInput["companions"];
  expect(await replies.submitPersonal(code, { attending: true, partySize: 2, companions: noLabel })).toBe("companion_incomplete");
  const badLabel = [{ name: "Tom", kind: "pet" }] as unknown as PersonalInput["companions"];
  expect(await replies.submitPersonal(code, { attending: true, partySize: 2, companions: badLabel })).toBe("companion_incomplete");
  expect((await replies.summary()).totalReplies).toBe(0);
});

test("a Reply that says not coming takes no Companions", async () => {
  const { guests, replies } = await setup();
  const sarah = await guests.add({ name: "Sarah Johnson", language: "en", notes: "" });
  const code = sarah.personalLinkCode;

  expect(await replies.submitPersonal(code, { attending: false, partySize: 1, companions: [adult("Tom")] })).toBe("recorded");

  expect(await replies.currentForPersonalLink(code)).toMatchObject({ attending: false, partySize: 1, companions: [] });
});

test("changing a Reply replaces the Companions too", async () => {
  const { guests, replies } = await setup();
  const sarah = await guests.add({ name: "Sarah Johnson", language: "en", notes: "" });
  const code = sarah.personalLinkCode;

  await replies.submitPersonal(code, { attending: true, partySize: 3, companions: [adult("Tom"), child("Mia")] });
  await replies.submitPersonal(code, { attending: true, partySize: 2, companions: [child("Mia")] });

  expect(await replies.currentForPersonalLink(code)).toMatchObject({ attending: true, partySize: 2, companions: [child("Mia")] });
  const summary = await replies.summary();
  expect(summary.adults).toBe(1);
  expect(summary.children).toBe(1);
});

test("the Shared link follows the same Companion rules", async () => {
  const db = testDb();
  const g = createGuestStore(db);
  const s = await g.add({ name: "Sarah Johnson", language: "en", notes: "" });
  const store = createReplyStore(db, { guests: g, jev: scriptedJev({ Sarah: sure(s) }) });

  expect((await store.submitShared(shared("Sarah", { partySize: 3, companions: [adult("Tom")] }))).outcome).toBe("companion_count");
  expect((await store.submitShared(shared("Sarah", { partySize: 2, companions: [adult("")] }))).outcome).toBe("companion_incomplete");
  expect((await store.summary()).totalReplies).toBe(0);

  expect((await store.submitShared(shared("Sarah", { partySize: 2, companions: [child("Mia")] }))).outcome).toBe("confirmed");
  const summary = await store.summary();
  expect(summary.coming[0].reply.companions).toEqual([child("Mia")]);
  expect(summary.headcount).toBe(2);
  expect(summary.children).toBe(1);
});

test("a Reply with Party size one needs no Companions on either link", async () => {
  const { guests, replies } = await setup();
  const sarah = await guests.add({ name: "Sarah Johnson", language: "en", notes: "" });

  expect(await replies.submitPersonal(sarah.personalLinkCode, { attending: true, partySize: 1 })).toBe("recorded");
  expect((await replies.submitShared(shared("Nobody Known"))).outcome).toBe("no_match");
});

test("a Reply saved before Companions existed still works and counts every person as an adult", async () => {
  const db = testDb();
  const g = createGuestStore(db);
  const sarah = await g.add({ name: "Sarah Johnson", language: "en", notes: "" });
  await db.execute(`CREATE TABLE rsvps (
      id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL DEFAULT (datetime('now')),
      name TEXT NOT NULL, relation TEXT NOT NULL, attending INTEGER NOT NULL, party_size INTEGER NOT NULL,
      matched_guest_id TEXT, confidence REAL, status TEXT NOT NULL)`);
  await db.execute({
    sql: "INSERT INTO rsvps (name, relation, attending, party_size, matched_guest_id, confidence, status) VALUES ('Sarah','friend',1,3,?,0.9,'matched')",
    args: [sarah.id],
  });
  const store = createReplyStore(db, { guests: g, jev: scriptedJev({}) });

  const summary = await store.summary();
  expect(summary.coming[0].reply.companions).toEqual([]);
  expect(summary.headcount).toBe(3);
  expect(summary.adults).toBe(3);
  expect(summary.children).toBe(0);
});

const contact = { phone: "555-0100" };
const request = (over: Partial<RequestInput> = {}): RequestInput => ({
  name: "Pat Stranger",
  source: "shared",
  ownWords: "Friend of Alex's soccer coach",
  contacts: contact,
  ...over,
});

test("a Request keeps the answer, Party size, Companions, source, own words and contacts", async () => {
  const { replies } = await setup();

  const outcome = await replies.submitRequest(
    request({
      attending: true,
      partySize: 3,
      companions: [
        { name: "Sam", kind: "adult" },
        { name: "Mia", kind: "child" },
      ],
      contacts: { phone: "555-0100", email: "pat@example.com", whatsapp: "555-0101", messenger: "pat.s", other: "carrier pigeon" },
    }),
  );

  expect(outcome).toBe("recorded");
  const [r] = await replies.listRequests();
  expect(r).toMatchObject({
    name: "Pat Stranger",
    attending: true,
    partySize: 3,
    companions: [
      { name: "Sam", kind: "adult" },
      { name: "Mia", kind: "child" },
    ],
    source: "shared",
    ownWords: "Friend of Alex's soccer coach",
    contacts: { phone: "555-0100", email: "pat@example.com", whatsapp: "555-0101", messenger: "pat.s", other: "carrier pigeon" },
  });
});

test("a Request may leave the coming answer open", async () => {
  const { replies } = await setup();
  expect(await replies.submitRequest(request({ source: "personal_forward" }))).toBe("recorded");
  const [r] = await replies.listRequests();
  expect(r).toMatchObject({ attending: null, partySize: 1, companions: [], source: "personal_forward" });
});

test("a Request needs a name", async () => {
  const { replies } = await setup();
  expect(await replies.submitRequest(request({ name: "   " }))).toBe("name_required");
  expect(await replies.listRequests()).toEqual([]);
});

test("a Request needs at least one way to reach the person", async () => {
  const { replies } = await setup();
  expect(await replies.submitRequest(request({ contacts: {} }))).toBe("contact_required");
  expect(await replies.submitRequest(request({ contacts: { phone: "  ", email: "" } }))).toBe("contact_required");
  expect(await replies.listRequests()).toEqual([]);
});

test("a Request that says coming must name its Companions", async () => {
  const { replies } = await setup();
  expect(await replies.submitRequest(request({ attending: true, partySize: 2 }))).toBe("companion_count");
  expect(
    await replies.submitRequest(request({ attending: true, partySize: 2, companions: [{ name: " ", kind: "adult" }] })),
  ).toBe("companion_incomplete");
  expect(await replies.listRequests()).toEqual([]);
});

test("Requests are not counted in the headcount or the review list", async () => {
  const { replies } = await setup();
  await replies.submitRequest(request({ attending: true, partySize: 1 }));
  const s = await replies.summary();
  expect(s.headcount).toBe(0);
  expect(s.coming).toEqual([]);
  expect(s.review).toEqual([]);
  expect(s.totalReplies).toBe(0);
});

test("Requests are listed newest first", async () => {
  const { replies } = await setup();
  await replies.submitRequest(request({ name: "First" }));
  await replies.submitRequest(request({ name: "Second" }));
  expect((await replies.listRequests()).map((r) => r.name)).toEqual(["Second", "First"]);
});

test("accepting a Request makes a Guest with a Personal link, keeps its Reply and counts it, and removes the Request", async () => {
  const { guests, replies } = await setup();
  await replies.submitRequest(
    request({ attending: true, partySize: 3, companions: [{ name: "Sam", kind: "adult" }, { name: "Mia", kind: "child" }] }),
  );
  const [req] = await replies.listRequests();
  expect((await replies.summary()).headcount).toBe(0);

  const outcome = await replies.acceptRequest(req.id, "es");

  expect(outcome).toBe("accepted");
  expect(await replies.listRequests()).toEqual([]);
  const [guest] = await guests.list();
  expect(guest).toMatchObject({ name: "Pat Stranger", language: "es" });
  expect(await replies.guestForPersonalLink(guest.personalLinkCode)).toMatchObject({ id: guest.id });
  const summary = await replies.summary();
  expect(summary.coming.map((e) => e.name)).toEqual(["Pat Stranger"]);
  expect(summary.headcount).toBe(3);
  expect(summary.children).toBe(1);
  expect(summary.noReply).toEqual([]);
  expect(await replies.currentForPersonalLink(guest.personalLinkCode)).toMatchObject({
    attending: true,
    partySize: 3,
    companions: [{ name: "Sam", kind: "adult" }, { name: "Mia", kind: "child" }],
  });
});

test("accepting a Request that said not coming makes a declined Guest; one with no answer makes a Guest with no Reply", async () => {
  const { replies } = await setup();
  await replies.submitRequest(request({ name: "No Thanks", attending: false }));
  await replies.submitRequest(request({ name: "Undecided" }));
  const reqs = await replies.listRequests();

  for (const r of reqs) await replies.acceptRequest(r.id, "en");

  const summary = await replies.summary();
  expect(summary.declined.map((e) => e.name)).toEqual(["No Thanks"]);
  expect(summary.noReply.map((g) => g.name)).toEqual(["Undecided"]);
  expect(summary.headcount).toBe(0);
});

test("declining a Request removes it without creating a Guest or counting anything", async () => {
  const { guests, replies } = await setup();
  await replies.submitRequest(request({ attending: true, partySize: 1 }));
  const [req] = await replies.listRequests();

  expect(await replies.declineRequest(req.id)).toBe("declined");

  expect(await replies.listRequests()).toEqual([]);
  expect(await guests.list()).toEqual([]);
  const summary = await replies.summary();
  expect(summary.headcount).toBe(0);
  expect(summary.totalReplies).toBe(0);
});

test("a Request that is already gone cannot be accepted or declined again", async () => {
  const { guests, replies } = await setup();
  await replies.submitRequest(request());
  const [req] = await replies.listRequests();
  await replies.acceptRequest(req.id, "en");

  expect(await replies.acceptRequest(req.id, "en")).toBe("not_found");
  expect(await replies.declineRequest(req.id)).toBe("not_found");
  expect(await guests.list()).toHaveLength(1);
});

test("'This is an existing Guest' gives the Request's Reply to the chosen Guest and removes the Request", async () => {
  const { guests, replies } = await setup();
  const michael = await guests.add({ name: "Michael Johnson", language: "en", notes: "" });
  await replies.submitRequest(
    request({ name: "Plants", attending: true, partySize: 3, companions: [{ name: "Sam", kind: "adult" }, { name: "Mia", kind: "child" }] }),
  );
  const [req] = await replies.listRequests();

  expect(await replies.assignRequestToGuest(req.id, michael.id)).toBe("assigned");

  expect(await replies.listRequests()).toEqual([]);
  expect(await guests.list()).toHaveLength(1);
  const s = await replies.summary();
  expect(s.coming[0]).toMatchObject({ name: "Michael Johnson" });
  expect(s.headcount).toBe(3);
  expect(s.children).toBe(1);
});

test("assigning a Request with no answer leaves the Guest without a Reply", async () => {
  const { guests, replies } = await setup();
  const michael = await guests.add({ name: "Michael Johnson", language: "en", notes: "" });
  await replies.submitRequest(request({}));
  const [req] = await replies.listRequests();

  expect(await replies.assignRequestToGuest(req.id, michael.id)).toBe("assigned");
  expect((await replies.summary()).noReply.map((g) => g.name)).toEqual(["Michael Johnson"]);
});

test("a Request is only assigned to an active Guest, and only once", async () => {
  const { guests, replies } = await setup();
  const michael = await guests.add({ name: "Michael Johnson", language: "en", notes: "" });
  const gone = await guests.add({ name: "Gone Guest", language: "en", notes: "" });
  await guests.archive(gone.id);
  await replies.submitRequest(request({}));
  const [req] = await replies.listRequests();

  expect(await replies.assignRequestToGuest(req.id, "gst_nope")).toBe("unknown_guest");
  expect(await replies.assignRequestToGuest(req.id, gone.id)).toBe("unknown_guest");
  expect(await replies.listRequests()).toHaveLength(1);
  expect(await replies.assignRequestToGuest(req.id, michael.id)).toBe("assigned");
  expect(await replies.assignRequestToGuest(req.id, michael.id)).toBe("not_found");
});

// "Not [name]?" on a Personal link
const notMe = (name: string, over: Partial<SharedReply> = {}) => shared(name, over);

test("Not [name]?: matching another guest records their reply and leaves the link owner's reply untouched", async () => {
  const db = testDb();
  const g = createGuestStore(db);
  const owner = await g.add({ name: "Sarah Johnson", language: "en", notes: "" });
  const other = await g.add({ name: "Emma Rodriguez", language: "en", notes: "" });
  const store = createReplyStore(db, { guests: g, jev: scriptedJev({ Emma: sure(other) }) });
  await store.submitPersonal(owner.personalLinkCode, { attending: true, ...party(2) });

  const { outcome } = await store.submitFromPersonalLink(owner.personalLinkCode, notMe("Emma", { attending: false }));

  expect(outcome).toBe("confirmed");
  expect(await store.currentForPersonalLink(owner.personalLinkCode)).toMatchObject({
    attending: true,
    partySize: 2,
    companions: [{ name: "Guest 2", kind: "adult" }],
  });
  const summary = await store.summary();
  expect(summary.coming.map((e) => e.name)).toEqual(["Sarah Johnson"]);
  expect(summary.declined.map((e) => e.name)).toEqual(["Emma Rodriguez"]);
});

test("Not [name]?: identifying as the link's own guest records the reply for that guest", async () => {
  const db = testDb();
  const g = createGuestStore(db);
  const owner = await g.add({ name: "Sarah Johnson", language: "en", notes: "" });
  const store = createReplyStore(db, { guests: g, jev: scriptedJev({ Sarah: sure(owner) }) });

  expect((await store.submitFromPersonalLink(owner.personalLinkCode, notMe("Sarah", { ...party(2) }))).outcome).toBe("confirmed");
  expect((await store.summary()).coming.map((e) => e.name)).toEqual(["Sarah Johnson"]);
});

test("Not [name]?: an unsure match goes to review and does not touch the link owner's reply", async () => {
  const db = testDb();
  const g = createGuestStore(db);
  const owner = await g.add({ name: "Sarah Johnson", language: "en", notes: "" });
  const other = await g.add({ name: "Emma Rodriguez", language: "en", notes: "" });
  const store = createReplyStore(db, { guests: g, jev: scriptedJev({ Emma: unsure(other) }) });
  await store.submitPersonal(owner.personalLinkCode, { attending: true, partySize: 1 });

  expect((await store.submitFromPersonalLink(owner.personalLinkCode, notMe("Emma", { attending: false }))).outcome).toBe("review");

  const summary = await store.summary();
  expect(summary.review.map((r) => r.suggestedGuestName)).toEqual(["Emma Rodriguez"]);
  expect(summary.coming.map((e) => e.name)).toEqual(["Sarah Johnson"]);
  expect(summary.declined).toEqual([]);
});

test("Not [name]?: nobody matched saves nothing and the visitor can leave a Request from a forwarded link", async () => {
  const { guests, replies } = await setup();
  const owner = await guests.add({ name: "Sarah Johnson", language: "en", notes: "" });

  expect((await replies.submitFromPersonalLink(owner.personalLinkCode, notMe("Stranger"))).outcome).toBe("no_match");
  expect((await replies.summary()).totalReplies).toBe(0);

  const input: RequestInput = { name: "Stranger", source: "personal_forward", contacts: { phone: "555" } };
  expect(await replies.submitRequest(input)).toBe("recorded");
  expect((await replies.listRequests())[0].source).toBe("personal_forward");
});

test("Not [name]?: unknown, archived and badly formed are refused", async () => {
  const { guests, replies } = await setup();
  const owner = await guests.add({ name: "Sarah Johnson", language: "en", notes: "" });
  expect((await replies.submitFromPersonalLink("nope", notMe("Emma"))).outcome).toBe("unknown_link");
  expect((await replies.submitFromPersonalLink(owner.personalLinkCode, notMe("Emma", { partySize: 3 }))).outcome).toBe("companion_count");
  await guests.archive(owner.id);
  expect((await replies.submitFromPersonalLink(owner.personalLinkCode, notMe("Emma"))).outcome).toBe("no_longer_available");
});

test("Not [name]? follows the Reply deadline too", async () => {
  const closed = await withDeadline(7, FIRST_AFTER);
  const owner = await closed.guests.add({ name: "Sarah Johnson", language: "en", notes: "" });
  expect((await closed.replies.submitFromPersonalLink(owner.personalLinkCode, notMe("Anyone"))).outcome).toBe("closed");
  expect((await closed.replies.summary()).totalReplies).toBe(0);
});

test("an existing database from before the weak-guess columns is upgraded in place", async () => {
  const db = testDb();
  await db.execute(`CREATE TABLE requests (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL DEFAULT (datetime('now')),
    name TEXT NOT NULL, attending INTEGER, party_size INTEGER NOT NULL, companions TEXT NOT NULL, source TEXT NOT NULL,
    own_words TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL, whatsapp TEXT NOT NULL, messenger TEXT NOT NULL, other_contact TEXT NOT NULL)`);
  await db.execute(`INSERT INTO requests (name, party_size, companions, source, own_words, phone, email, whatsapp, messenger, other_contact)
    VALUES ('Old', 1, '[]', 'shared', '', '1', '', '', '', '')`);
  const replies = createReplyStore(db, { guests: createGuestStore(db), jev: scriptedJev({}) });

  expect((await replies.listRequests())[0]).toMatchObject({ name: "Old", guess: null, jevUnavailable: false });
});

// Households: two linked partners, each a Guest with their own Personal link.
async function household(opts: { hasChildren?: boolean } = {}) {
  const db = testDb();
  const guests = createGuestStore(db);
  const replies = createReplyStore(db, { guests, jev: scriptedJev({}) });
  const ana = await guests.add({ name: "Ana Pérez", language: "es", notes: "", hasChildren: opts.hasChildren });
  const ben = await guests.add({ name: "Ben Pérez", language: "en", notes: "" });
  await guests.setPartner(ana.id, ben.id);
  return { db, guests, replies, ana, ben };
}

test("a Guest coming with their partner records a coming Reply for the partner, answered by the Guest", async () => {
  const { replies, ana, ben } = await household();

  expect(await replies.submitPersonal(ana.personalLinkCode, { attending: true, partySize: 1, withPartner: true })).toBe("recorded");

  const summary = await replies.summary();
  const byName = Object.fromEntries(summary.coming.map((e) => [e.name, e]));
  expect(byName["Ana Pérez"]).toMatchObject({ answeredBy: null, partySize: 1 });
  expect(byName["Ben Pérez"]).toMatchObject({ answeredBy: "Ana Pérez", partySize: 1 });
  expect(summary.headcount).toBe(2);
  expect(await replies.currentForPersonalLink(ben.personalLinkCode)).toMatchObject({ attending: true, partySize: 1, answeredBy: "Ana Pérez" });
});

test("saying No, or Yes without the partner, records nothing for the partner", async () => {
  const { replies, ana, ben } = await household();

  await replies.submitPersonal(ana.personalLinkCode, { attending: false, partySize: 1, withPartner: true });
  expect(await replies.currentForPersonalLink(ben.personalLinkCode)).toBeNull();
  await replies.submitPersonal(ana.personalLinkCode, { attending: true, partySize: 1, withPartner: false });
  expect(await replies.currentForPersonalLink(ben.personalLinkCode)).toBeNull();

  expect((await replies.summary()).headcount).toBe(1);
});

test("an archived partner is never recorded, and a Guest with no partner is unaffected", async () => {
  const { guests, replies, ana, ben } = await household();
  const solo = await guests.add({ name: "Solo", language: "en", notes: "" });
  await guests.archive(ben.id);

  await replies.submitPersonal(ana.personalLinkCode, { attending: true, partySize: 1, withPartner: true });
  await replies.submitPersonal(solo.personalLinkCode, { attending: true, partySize: 1, withPartner: true });
  await guests.restore(ben.id);

  expect(await replies.currentForPersonalLink(ben.personalLinkCode)).toBeNull();
  expect((await replies.summary()).headcount).toBe(2);
});

test("answering for a partner who already said they are coming keeps the partner's own Reply", async () => {
  const { replies, ana, ben } = await household();
  await replies.submitPersonal(ben.personalLinkCode, { attending: true, partySize: 2, companions: [adult("Gran")] });

  await replies.submitPersonal(ana.personalLinkCode, { attending: true, partySize: 1, withPartner: true });

  expect(await replies.currentForPersonalLink(ben.personalLinkCode)).toMatchObject({ partySize: 2, companions: [adult("Gran")], answeredBy: null });
  expect((await replies.summary()).headcount).toBe(3);
});

test("a partner can change the Reply given for them; the latest Reply counts, as their own", async () => {
  const { replies, ana, ben } = await household();
  await replies.submitPersonal(ana.personalLinkCode, { attending: true, partySize: 1, withPartner: true });

  await replies.submitPersonal(ben.personalLinkCode, { attending: false, partySize: 1 });

  const summary = await replies.summary();
  expect(summary.declined).toMatchObject([{ name: "Ben Pérez", answeredBy: null }]);
  expect(summary.headcount).toBe(1);
});

test("answering for a partner follows the Reply deadline: nothing is recorded for either after it", async () => {
  const { replies, guest, guests } = await withDeadline(7, FIRST_AFTER);
  const partner = await guests.add({ name: "Tom Partner", language: "en", notes: "" });
  await guests.setPartner(guest.id, partner.id);

  expect(await replies.submitPersonal(guest.personalLinkCode, { attending: true, partySize: 1, withPartner: true })).toBe("closed");
  expect((await replies.summary()).totalReplies).toBe(0);
});

const kid = (name = "", kind: "adult" | "child" | null = null) => ({ name, kind });

test("a Guest with children says how many are coming; names and labels are optional", async () => {
  const { replies, ana } = await household({ hasChildren: true });

  const outcome = await replies.submitPersonal(ana.personalLinkCode, {
    attending: true,
    partySize: 1,
    children: [kid(), kid("  Lola  "), kid("Max", "adult")],
  });

  expect(outcome).toBe("recorded");
  const summary = await replies.summary();
  expect(summary.coming[0]).toMatchObject({ name: "Ana Pérez", partySize: 4, children: [kid(), kid("Lola"), kid("Max", "adult")] });
  expect(summary.headcount).toBe(4);
  expect(summary.children).toBe(2); // an unlabelled child counts as a child
  expect(summary.adults).toBe(2);
});

test("a household's children are counted once: the newest coming Reply that answered about them wins", async () => {
  const { replies, ana, ben } = await household({ hasChildren: true });
  await replies.submitPersonal(ana.personalLinkCode, { attending: true, partySize: 1, withPartner: true, children: [kid("Lola"), kid()] });
  expect((await replies.summary()).headcount).toBe(4); // Ana, Ben (answered by Ana), two children

  // Ben replies himself and mentions the children too: still two children, now counted on Ben's Reply.
  await replies.submitPersonal(ben.personalLinkCode, { attending: true, partySize: 1, children: [kid("Lola"), kid("Tito")] });
  let summary = await replies.summary();
  expect(summary.headcount).toBe(4);
  expect(summary.children).toBe(2);
  const byName = () => Object.fromEntries(summary.coming.map((e) => [e.name, e]));
  expect(byName()["Ben Pérez"]).toMatchObject({ partySize: 3, children: [kid("Lola"), kid("Tito")] });
  expect(byName()["Ana Pérez"]).toMatchObject({ partySize: 1, children: null });

  // Ana changes her Reply and says the children are not coming after all: none are counted.
  await replies.submitPersonal(ana.personalLinkCode, { attending: true, partySize: 1, withPartner: true, children: [] });
  summary = await replies.summary();
  expect(summary.headcount).toBe(2);
  expect(summary.children).toBe(0);
  expect(summary.coming.map((e) => e.partySize)).toEqual([1, 1]); // the Party sizes shown add up to the headcount
});

test("children stated by a parent who then says No stop counting; a Reply that did not answer about them changes nothing", async () => {
  const { replies, ana, ben } = await household({ hasChildren: true });
  await replies.submitPersonal(ana.personalLinkCode, { attending: true, partySize: 1, withPartner: true, children: [kid(), kid(), kid()] });
  await replies.submitPersonal(ben.personalLinkCode, { attending: true, partySize: 1 }); // did not answer about the children
  expect((await replies.summary()).headcount).toBe(5);

  await replies.submitPersonal(ana.personalLinkCode, { attending: false, partySize: 1 });

  const summary = await replies.summary();
  expect(summary.headcount).toBe(1);
  expect(summary.children).toBe(0);
});

test("children are taken when the Guest or their partner is marked as having them, and ignored otherwise", async () => {
  const { guests, replies, ben } = await household({ hasChildren: true }); // only Ana is marked
  const solo = await guests.add({ name: "Solo", language: "en", notes: "" });

  await replies.submitPersonal(ben.personalLinkCode, { attending: true, partySize: 1, children: [kid()] });
  await replies.submitPersonal(solo.personalLinkCode, { attending: true, partySize: 1, children: [kid(), kid()] });

  const summary = await replies.summary();
  expect(summary.headcount).toBe(3);
  expect(summary.children).toBe(1);
});

test("more children than the largest Party size is refused and nothing is recorded", async () => {
  const { replies, ana } = await household({ hasChildren: true });

  expect(await replies.submitPersonal(ana.personalLinkCode, { attending: true, partySize: 1, children: Array.from({ length: 11 }, () => kid()) })).toBe("children_count");
  expect((await replies.summary()).totalReplies).toBe(0);
});

test("a Personal link tells the page about the household: the active partner, whether they are coming, and the children counted", async () => {
  const { guests, replies, ana, ben } = await household({ hasChildren: true });
  const solo = await guests.add({ name: "Solo", language: "en", notes: "" });

  expect(await replies.householdForPersonalLink(ben.personalLinkCode)).toEqual({ partnerName: "Ana Pérez", partnerComing: false, hasChildren: true, children: null });
  await replies.submitPersonal(ana.personalLinkCode, { attending: true, partySize: 1, withPartner: true, children: [kid("Lola")] });
  expect(await replies.householdForPersonalLink(ben.personalLinkCode)).toEqual({ partnerName: "Ana Pérez", partnerComing: true, hasChildren: true, children: [kid("Lola")] });

  expect(await replies.householdForPersonalLink(solo.personalLinkCode)).toEqual({ partnerName: null, partnerComing: false, hasChildren: false, children: null });
  await guests.archive(ana.id);
  expect(await replies.householdForPersonalLink(ben.personalLinkCode)).toEqual({ partnerName: null, partnerComing: false, hasChildren: false, children: null });
  expect(await replies.householdForPersonalLink("nope")).toBeNull();
});

test("Replies saved before households existed keep their meaning, and new household Replies work on the upgraded table", async () => {
  const db = testDb();
  const guests = createGuestStore(db);
  const ana = await guests.add({ name: "Ana Pérez", language: "es", notes: "", hasChildren: true });
  const ben = await guests.add({ name: "Ben Pérez", language: "en", notes: "" });
  await db.execute(`CREATE TABLE rsvps (
      id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL DEFAULT (datetime('now')),
      name TEXT NOT NULL, relation TEXT NOT NULL, attending INTEGER NOT NULL, party_size INTEGER NOT NULL,
      matched_guest_id TEXT, confidence REAL, status TEXT NOT NULL, contact_token TEXT, review_contact TEXT,
      decision TEXT, assigned_guest_id TEXT, new_guest_name TEXT, companions TEXT)`);
  await db.execute({
    sql: `INSERT INTO rsvps (name, relation, attending, party_size, matched_guest_id, confidence, status, companions)
          VALUES ('Ben', 'Personal link', 1, 2, ?, 1, 'matched', '[{"name":"Mia","kind":"child"}]')`,
    args: [ben.id],
  });
  const replies = createReplyStore(db, { guests, jev: scriptedJev({}) });

  expect((await replies.summary()).coming).toMatchObject([{ name: "Ben Pérez", partySize: 2, answeredBy: null, linkedWith: null, children: null }]);

  await guests.setPartner(ana.id, ben.id);
  await replies.submitPersonal(ana.personalLinkCode, { attending: true, partySize: 1, withPartner: true, children: [kid()] });
  let summary = await replies.summary();
  expect(summary.headcount).toBe(4); // Ana, her child, Ben and his Companion Mia (Ben's own Reply kept)
  expect(summary.children).toBe(2);
  expect(summary.coming.find((e) => e.name === "Ana Pérez")).toMatchObject({ linkedWith: "Ben Pérez", childrenCountedFrom: null });

  // On the upgraded table a Reply given for a partner can be withdrawn too.
  const cleo = await guests.add({ name: "Cleo", language: "en", notes: "" });
  const dan = await guests.add({ name: "Dan", language: "en", notes: "" });
  await guests.setPartner(cleo.id, dan.id);
  await replies.submitPersonal(cleo.personalLinkCode, { attending: true, partySize: 1, withPartner: true });
  await replies.submitPersonal(cleo.personalLinkCode, { attending: false, partySize: 1 });
  summary = await replies.summary();
  expect(summary.noReply.map((g) => g.name)).toEqual(["Dan"]);
});

test("answering for a partner who said No themselves leaves their No in place", async () => {
  const { replies, ana, ben } = await household();
  await replies.submitPersonal(ben.personalLinkCode, { attending: false, partySize: 1 });

  await replies.submitPersonal(ana.personalLinkCode, { attending: true, partySize: 1, withPartner: true });

  expect(await replies.currentForPersonalLink(ben.personalLinkCode)).toMatchObject({ attending: false, answeredBy: null });
  expect((await replies.summary()).headcount).toBe(1);
});

test("when the Guest changes to No, or comes without their partner, the Reply they gave the partner is withdrawn", async () => {
  for (const change of [{ attending: false, partySize: 1 }, { attending: true, partySize: 1, withPartner: false }]) {
    const { replies, ana, ben } = await household();
    await replies.submitPersonal(ana.personalLinkCode, { attending: true, partySize: 1, withPartner: true });

    await replies.submitPersonal(ana.personalLinkCode, change);

    expect(await replies.currentForPersonalLink(ben.personalLinkCode)).toBeNull();
    expect((await replies.summary()).noReply.map((g) => g.name)).toEqual(["Ben Pérez"]);
  }
});

test("a partner who replied themselves keeps their own Reply when the Guest later changes", async () => {
  const { replies, ana, ben } = await household();
  await replies.submitPersonal(ana.personalLinkCode, { attending: true, partySize: 1, withPartner: true });
  await replies.submitPersonal(ben.personalLinkCode, { attending: true, partySize: 2, companions: [adult("Gran")] });

  await replies.submitPersonal(ana.personalLinkCode, { attending: false, partySize: 1 });

  expect(await replies.currentForPersonalLink(ben.personalLinkCode)).toMatchObject({ attending: true, partySize: 2, answeredBy: null });
  expect((await replies.summary()).headcount).toBe(2);
});

test("a household Reply remembers who the replier was linked with, even after the Host unlinks them", async () => {
  const { guests, replies, ana } = await household({ hasChildren: true });
  const solo = await guests.add({ name: "Solo", language: "en", notes: "" });
  await replies.submitPersonal(ana.personalLinkCode, { attending: true, partySize: 1, withPartner: true, children: [kid()] });
  await replies.submitPersonal(solo.personalLinkCode, { attending: true, partySize: 1 });

  await guests.setPartner(ana.id, null);

  const linkedWith = Object.fromEntries((await replies.summary()).coming.map((e) => [e.name, e.linkedWith]));
  expect(linkedWith).toEqual({ "Ana Pérez": "Ben Pérez", "Ben Pérez": null, Solo: null }); // Ben's Reply is tagged "Answered by" instead
});

test("after an unlink each parent's own answer about the children counts", async () => {
  const { guests, replies, ana, ben } = await household({ hasChildren: true });
  await replies.submitPersonal(ana.personalLinkCode, { attending: true, partySize: 1, children: [kid(), kid()] });
  await replies.submitPersonal(ben.personalLinkCode, { attending: true, partySize: 1, children: [kid(), kid()] });
  expect((await replies.summary()).children).toBe(2);

  await guests.setPartner(ana.id, null);

  expect((await replies.summary()).children).toBe(4); // explained on the dashboard by "Replied while linked with"
});

test("answering for a partner again adds no second Reply for them; an answer given by someone else is replaced", async () => {
  const { guests, replies, ana, ben } = await household();
  const cleo = await guests.add({ name: "Cleo", language: "en", notes: "" });
  await replies.submitPersonal(ana.personalLinkCode, { attending: true, partySize: 1, withPartner: true });
  await replies.submitPersonal(ana.personalLinkCode, { attending: true, partySize: 1, withPartner: true });
  expect((await replies.summary()).coming.find((e) => e.name === "Ben Pérez")).toMatchObject({ replyCount: 1, answeredBy: "Ana Pérez" });

  // Ben is relinked with Cleo, who answers for him: her answer replaces Ana's, and only Cleo can withdraw it now.
  await guests.setPartner(ben.id, cleo.id);
  await replies.submitPersonal(cleo.personalLinkCode, { attending: true, partySize: 1, withPartner: true });
  expect(await replies.currentForPersonalLink(ben.personalLinkCode)).toMatchObject({ attending: true, answeredBy: "Cleo" });

  // When Cleo then says No, Ben goes back to no Reply, not to Ana's old answer.
  await replies.submitPersonal(cleo.personalLinkCode, { attending: false, partySize: 1 });
  expect(await replies.currentForPersonalLink(ben.personalLinkCode)).toBeNull();
});

test("a Guest who changes to No withdraws the Reply they gave their partner even while the partner is archived", async () => {
  const { guests, replies, ana, ben } = await household();
  await replies.submitPersonal(ana.personalLinkCode, { attending: true, partySize: 1, withPartner: true });
  await guests.archive(ben.id);

  await replies.submitPersonal(ana.personalLinkCode, { attending: false, partySize: 1 });
  await guests.restore(ben.id);

  expect(await replies.currentForPersonalLink(ben.personalLinkCode)).toBeNull();
});

test("a coming Reply that leaves the partner question unanswered withdraws nothing", async () => {
  const { replies, ana, ben } = await household();
  await replies.submitPersonal(ana.personalLinkCode, { attending: true, partySize: 1, withPartner: true });

  await replies.submitPersonal(ana.personalLinkCode, { attending: true, partySize: 1 });

  expect(await replies.currentForPersonalLink(ben.personalLinkCode)).toMatchObject({ attending: true, answeredBy: "Ana Pérez" });
});

test("a Reply given for a partner does not say who they were linked with; only the replier's own Reply does", async () => {
  const { replies, ana } = await household();
  await replies.submitPersonal(ana.personalLinkCode, { attending: true, partySize: 1, withPartner: true });

  const byName = Object.fromEntries((await replies.summary()).coming.map((e) => [e.name, e]));
  expect(byName["Ana Pérez"]).toMatchObject({ linkedWith: "Ben Pérez", answeredBy: null });
  expect(byName["Ben Pérez"]).toMatchObject({ linkedWith: null, answeredBy: "Ana Pérez" });
});

test("a parent whose children answer is not the one counted is told whose answer counts", async () => {
  const { replies, ana, ben } = await household({ hasChildren: true });
  await replies.submitPersonal(ben.personalLinkCode, { attending: true, partySize: 1, children: [kid()] });
  await replies.submitPersonal(ana.personalLinkCode, { attending: true, partySize: 1, children: [kid(), kid()] });

  const byName = Object.fromEntries((await replies.summary()).coming.map((e) => [e.name, e]));
  expect(byName["Ana Pérez"]).toMatchObject({ children: [kid(), kid()], childrenCountedFrom: null });
  expect(byName["Ben Pérez"]).toMatchObject({ children: null, childrenCountedFrom: "Ana Pérez" });
});

test("an archived parent's children answer is ignored: the other parent's own answer counts, with a note; restoring brings it back", async () => {
  const { guests, replies, ana, ben } = await household({ hasChildren: true });
  await replies.submitPersonal(ben.personalLinkCode, { attending: true, partySize: 1, children: [kid()] });
  await replies.submitPersonal(ana.personalLinkCode, { attending: true, partySize: 1, children: [kid(), kid(), kid()] });
  expect((await replies.summary()).children).toBe(3);

  await guests.archive(ana.id);
  let summary = await replies.summary();
  expect(summary.children).toBe(1);
  expect(summary.coming).toMatchObject([{ name: "Ben Pérez", partySize: 2, children: [kid()], childrenCountedFrom: "Ben Pérez" }]);

  await guests.restore(ana.id);
  summary = await replies.summary();
  expect(summary.children).toBe(3);
  // The archived-parent note is gone; Ben's row is back to pointing at Ana's newer answer.
  expect(summary.coming.find((e) => e.name === "Ben Pérez")).toMatchObject({ partySize: 1, children: null, childrenCountedFrom: "Ana Pérez" });
});

test("the Host records an answer given in person; it counts, shows who entered it, and can be undone", async () => {
  const { guests, replies } = await setup();
  const ana = await guests.add({ name: "Ana", language: "es", notes: "" });
  const ben = await guests.add({ name: "Ben", language: "es", notes: "" });

  expect(await replies.recordForGuest(ana.id, { attending: true, ...party(3) })).toBe("recorded");
  expect(await replies.recordForGuest(ben.id, { attending: false, partySize: 1 })).toBe("recorded");
  const s = await replies.summary();
  expect(s.coming.map((e) => [e.name, e.by, e.partySize])).toEqual([["Ana", "host", 3]]);
  expect(s.declined.map((e) => [e.name, e.by])).toEqual([["Ben", "host"]]);
  expect(s.noReply).toEqual([]);
  expect(s.headcount).toBe(3);

  await replies.undo(s.coming[0].reply.id);
  const after = await replies.summary();
  expect(after.coming).toEqual([]);
  expect(after.noReply.map((g) => g.name)).toEqual(["Ana"]);
});

test("a Reply recorded by the Host needs the right number of named Companions, and a real guest", async () => {
  const { guests, replies } = await setup();
  const ana = await guests.add({ name: "Ana", language: "es", notes: "" });
  expect(await replies.recordForGuest(ana.id, { attending: true, partySize: 3, companions: [] })).toBe("companion_count");
  expect(await replies.recordForGuest("gst_nobody", { attending: false, partySize: 1 })).toBe("unknown_guest");
  expect((await replies.summary()).noReply).toHaveLength(1);
});

test("recording a couple together counts both, and undoing takes back both", async () => {
  const { guests, replies } = await setup();
  const ana = await guests.add({ name: "Ana", language: "es", notes: "" });
  const ben = await guests.add({ name: "Ben", language: "es", notes: "" });
  await guests.setPartner(ana.id, ben.id);

  await replies.recordForGuest(ana.id, { attending: true, partySize: 1, withPartner: true });
  const s = await replies.summary();
  expect(s.coming.map((e) => e.name).sort()).toEqual(["Ana", "Ben"]);
  expect(s.headcount).toBe(2);

  await replies.undo(s.coming.find((e) => e.name === "Ana")!.reply.id);
  const after = await replies.summary();
  expect(after.coming).toEqual([]);
  expect(after.noReply).toHaveLength(2);
});

test("a Guest's own newer Reply replaces what the Host recorded", async () => {
  const { guests, replies } = await setup();
  const ana = await guests.add({ name: "Ana", language: "es", notes: "" });
  await replies.recordForGuest(ana.id, { attending: true, partySize: 1 });
  await replies.submitPersonal(ana.personalLinkCode, { attending: false, partySize: 1 });
  const s = await replies.summary();
  expect(s.coming).toEqual([]);
  expect(s.declined.map((e) => [e.name, e.by])).toEqual([["Ana", "jev"]]);
});

test("accepting a Request can rename the new Guest, link a partner and mark children; a refused partner keeps the Request", async () => {
  const { guests, replies } = await setup();
  const anna = await guests.add({ name: "Anna", language: "en", notes: "" });
  const taken = await guests.add({ name: "Taken", language: "en", notes: "" });
  const other = await guests.add({ name: "Other", language: "en", notes: "" });
  await guests.setPartner(taken.id, other.id);
  await replies.submitRequest(request({ name: "mama de milena" }));
  const [req] = await replies.listRequests();

  await expect(replies.acceptRequest(req.id, "en", { partnerId: taken.id })).rejects.toThrow();
  expect(await replies.listRequests()).toHaveLength(1);

  await replies.acceptRequest(req.id, "es", { name: "  Paola Moheyer ", partnerId: anna.id, hasChildren: true });

  const all = await guests.list();
  const paola = all.find((g) => g.name === "Paola Moheyer");
  expect(paola).toMatchObject({ language: "es", partnerId: anna.id, hasChildren: true });
  expect(all.find((g) => g.id === anna.id)?.partnerId).toBe(paola?.id);
});
