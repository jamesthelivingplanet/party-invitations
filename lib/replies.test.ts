import { expect, test } from "vitest";
import { testDb } from "@/test/db";
import { createGuestStore, type Guest } from "./guests";
import { createReplyStore, type JevAnswer, type Jev, type SharedReply } from "./replies";

/** A scripted Jev: answers by the name typed in the reply. Unscripted names get "nobody". */
function scriptedJev(script: Record<string, JevAnswer>): Jev {
  return async (input) => script[input.name] ?? { picked: "none", probabilities: { none: 0.9 } };
}

async function setup(script: Record<string, JevAnswer> = {}) {
  const db = testDb();
  const guests = createGuestStore(db);
  const replies = createReplyStore(db, { guests, jev: scriptedJev(script) });
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

  const outcome = await store.submitShared(shared("Sarah", { ...party(3) }));

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

  expect(await store.submitShared(shared("Sarah"))).toBe("review");

  const { review, coming, noReply } = await store.summary();
  expect(coming).toEqual([]);
  expect(noReply.map((x) => x.name)).toEqual(["Sarah Johnson"]);
  expect(review).toHaveLength(1);
  expect(review[0]).toMatchObject({ suggestedGuestId: s.id, suggestedGuestName: "Sarah Johnson" });
});

test("a 'nobody' answer with a plausible runner-up goes to review with that guest", async () => {
  const db = testDb();
  const g = createGuestStore(db);
  const s = await g.add({ name: "Sarah Johnson", language: "en", notes: "" });
  const store = createReplyStore(db, {
    guests: g,
    jev: scriptedJev({ Sara: { picked: "none", probabilities: { none: 0.7, [s.id]: 0.2 } } }),
  });

  expect(await store.submitShared(shared("Sara"))).toBe("review");

  const { review } = await store.summary();
  expect(review[0]).toMatchObject({ suggestedGuestId: s.id });
});

test("a 'nobody' answer with no plausible runner-up is no match, and still needs the host", async () => {
  const db = testDb();
  const g = createGuestStore(db);
  const s = await g.add({ name: "Sarah Johnson", language: "en", notes: "" });
  const store = createReplyStore(db, {
    guests: g,
    jev: scriptedJev({ Stranger: { picked: "none", probabilities: { none: 0.9, [s.id]: 0.05 } } }),
  });

  expect(await store.submitShared(shared("Stranger"))).toBe("no_match");

  const { review } = await store.summary();
  expect(review).toHaveLength(1);
  expect(review[0].suggestedGuestId).toBeNull();
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

  expect(await store.submitShared(shared("Sarah"))).toBe("no_match");
});

test("when Jev is unreachable the reply is still saved for review", async () => {
  const db = testDb();
  const g = createGuestStore(db);
  const store = createReplyStore(db, {
    guests: g,
    jev: async () => {
      throw new Error("down");
    },
  });

  expect(await store.submitShared(shared("Sarah"))).toBe("review");
  expect((await store.summary()).review).toHaveLength(1);
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
  const store = createReplyStore(db, { guests: g, jev: scriptedJev({}) });
  await store.submitShared(shared("Dad"));
  const [pending] = (await store.summary()).review;

  await store.assignToGuest(pending.id, dave.id);

  expect((await store.summary()).coming.map((e) => e.name)).toEqual(["Dave Example"]);
});

test("assigning to an unknown guest is refused", async () => {
  const { replies } = await setup();
  await replies.submitShared(shared("Dad"));
  const [pending] = (await replies.summary()).review;

  await expect(replies.assignToGuest(pending.id, "gst_nope")).rejects.toThrow();
});

test("marking a reply not invited sets it aside, and it can be brought back", async () => {
  const { replies } = await setup();
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

test("a reply the host welcomes by name counts as coming under that name", async () => {
  const { replies } = await setup();
  await replies.submitShared(shared("Stranger", { ...party(2) }));
  const [pending] = (await replies.summary()).review;

  await replies.welcomeAs(pending.id, "Pat Newcomer");

  const summary = await replies.summary();
  expect(summary.coming[0]).toMatchObject({ name: "Pat Newcomer", by: "new" });
  expect(summary.headcount).toBe(2);
  await expect(replies.welcomeAs(pending.id, "  ")).rejects.toThrow();
});

test("the summary counts every reply received, however it was sorted", async () => {
  const { replies } = await setup();
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
  expect(await replies.currentForPersonalLink(sarah.personalLinkCode)).toEqual({ attending: true, partySize: 3, companions: [adult("Guest 2"), adult("Guest 3")] });
  expect(await replies.currentForPersonalLink("nope")).toBeNull();
});

test("changing a Reply replaces the earlier one: counted once, latest answer", async () => {
  const { guests, replies } = await setup();
  const sarah = await guests.add({ name: "Sarah Johnson", language: "en", notes: "" });

  await replies.submitPersonal(sarah.personalLinkCode, { attending: true, ...party(4) });
  await replies.submitPersonal(sarah.personalLinkCode, { attending: true, ...party(2) });

  expect(await replies.currentForPersonalLink(sarah.personalLinkCode)).toEqual({ attending: true, ...party(2) });
  const summary = await replies.summary();
  expect(summary.coming.map((e) => e.name)).toEqual(["Sarah Johnson"]);
  expect(summary.headcount).toBe(2);
});

test("changing from coming to not coming removes the Guest from the headcount", async () => {
  const { guests, replies } = await setup();
  const sarah = await guests.add({ name: "Sarah Johnson", language: "en", notes: "" });

  await replies.submitPersonal(sarah.personalLinkCode, { attending: true, ...party(3) });
  await replies.submitPersonal(sarah.personalLinkCode, { attending: false, ...party(3) });

  expect(await replies.currentForPersonalLink(sarah.personalLinkCode)).toEqual({ attending: false, partySize: 1, companions: [] });
  const summary = await replies.summary();
  expect(summary.headcount).toBe(0);
  expect(summary.coming).toEqual([]);
  expect(summary.declined.map((e) => e.name)).toEqual(["Sarah Johnson"]);
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

  expect(await replies.currentForPersonalLink(code)).toEqual({ attending: true, partySize: 3, companions });
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

  expect(await replies.currentForPersonalLink(code)).toEqual({ attending: false, partySize: 1, companions: [] });
});

test("changing a Reply replaces the Companions too", async () => {
  const { guests, replies } = await setup();
  const sarah = await guests.add({ name: "Sarah Johnson", language: "en", notes: "" });
  const code = sarah.personalLinkCode;

  await replies.submitPersonal(code, { attending: true, partySize: 3, companions: [adult("Tom"), child("Mia")] });
  await replies.submitPersonal(code, { attending: true, partySize: 2, companions: [child("Mia")] });

  expect(await replies.currentForPersonalLink(code)).toEqual({ attending: true, partySize: 2, companions: [child("Mia")] });
  const summary = await replies.summary();
  expect(summary.adults).toBe(1);
  expect(summary.children).toBe(1);
});

test("the Shared link follows the same Companion rules", async () => {
  const db = testDb();
  const g = createGuestStore(db);
  const s = await g.add({ name: "Sarah Johnson", language: "en", notes: "" });
  const store = createReplyStore(db, { guests: g, jev: scriptedJev({ Sarah: sure(s) }) });

  expect(await store.submitShared(shared("Sarah", { partySize: 3, companions: [adult("Tom")] }))).toBe("companion_count");
  expect(await store.submitShared(shared("Sarah", { partySize: 2, companions: [adult("")] }))).toBe("companion_incomplete");
  expect((await store.summary()).totalReplies).toBe(0);

  expect(await store.submitShared(shared("Sarah", { partySize: 2, companions: [child("Mia")] }))).toBe("confirmed");
  const summary = await store.summary();
  expect(summary.coming[0].reply.companions).toEqual([child("Mia")]);
  expect(summary.headcount).toBe(2);
  expect(summary.children).toBe(1);
});

test("a Reply with Party size one needs no Companions on either link", async () => {
  const { guests, replies } = await setup();
  const sarah = await guests.add({ name: "Sarah Johnson", language: "en", notes: "" });

  expect(await replies.submitPersonal(sarah.personalLinkCode, { attending: true, partySize: 1 })).toBe("recorded");
  expect(await replies.submitShared(shared("Nobody Known"))).toBe("no_match");
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
