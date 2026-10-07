import { expect, test } from "vitest";
import { testDb } from "@/test/db";
import { createGuestStore, type Guest } from "./guests";
import { createReplyStore, type JevAnswer, type Jev } from "./replies";

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

const sure = (g: Guest): JevAnswer => ({ picked: g.id, probabilities: { [g.id]: 0.95, none: 0.05 } });
const unsure = (g: Guest): JevAnswer => ({ picked: g.id, probabilities: { [g.id]: 0.6, none: 0.4 } });

const shared = (name: string, over: Partial<{ attending: boolean; partySize: number }> = {}) => ({
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

  const outcome = await store.submitShared(shared("Sarah", { partySize: 3 }));

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

  await store.submitShared(shared("Sarah", { attending: true, partySize: 4 }));
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
  await store.submitShared(shared("Sarah", { partySize: 2 }));

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
  await store.submitShared(shared("Sarah", { partySize: 2 }));
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
  await replies.submitShared(shared("Stranger", { partySize: 2 }));
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
