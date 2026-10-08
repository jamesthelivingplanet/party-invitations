import { expect, test } from "vitest";
import { testDb } from "@/test/db";
import { createEventStore } from "./event";
import { createGuestStore } from "./guests";
import { createInvitationStore, ValidationError } from "./invitations";
import { createReplyStore } from "./replies";

const origin = "https://party.example";

function setup() {
  const db = testDb();
  const guests = createGuestStore(db);
  const event = createEventStore(db);
  const clock = { now: new Date("2026-11-01T10:00:00Z") };
  const replies = createReplyStore(db, { guests, jev: async () => ({ picked: "none", probabilities: { none: 1 } }) });
  const invitations = createInvitationStore(db, { guests, event, replies, now: () => clock.now });
  return { guests, event, invitations, replies, clock };
}

test("starting wording exists in both languages and mentions the placeholders that matter", async () => {
  const { invitations } = setup();

  for (const language of ["en", "es"] as const) {
    const template = await invitations.getTemplate(language);
    expect(template).toContain("{name}");
    expect(template).toContain("{link}");
  }
});

test("an English Guest's message greets them and carries their own Personal link and the event details", async () => {
  const { guests, event, invitations } = setup();
  await event.update({ name: "Alex's Birthday", date: "2026-12-19", time: "2:00 PM", place: "Fun Park", replyDeadlineDays: 7 });
  const sarah = await guests.add({ name: "Sarah Johnson", language: "en", notes: "" });
  await invitations.setTemplate(
    "en",
    "Hi {name}! {event} is on {date} at {time} at {place}. Reply by {deadline}: {link}",
  );

  const message = await invitations.messageFor(sarah.id, { origin });

  expect(message).toBe(
    `Hi Sarah Johnson! Alex's Birthday is on Saturday, December 19, 2026 at 2:00 PM at Fun Park. Reply by Saturday, December 12, 2026: ${origin}/i/${sarah.personalLinkCode}`,
  );
});

test("a Spanish Guest gets the Spanish template with the date written in Spanish", async () => {
  const { guests, event, invitations } = setup();
  await event.update({ date: "2026-12-19" });
  const pedro = await guests.add({ name: "Pedro", language: "es", notes: "" });
  await invitations.setTemplate("es", "Hola {name}, es el {date}. {link}");
  await invitations.setTemplate("en", "Hello {name} {link}");

  const message = await invitations.messageFor(pedro.id, { origin });

  expect(message).toBe(`Hola Pedro, es el sábado, 19 de diciembre de 2026. ${origin}/i/${pedro.personalLinkCode}`);
});

test("unset event details read as to be announced, never blank or a raw placeholder", async () => {
  const { guests, invitations, event } = setup();
  await event.update({ time: null, place: null, replyDeadlineDays: null });
  const en = await guests.add({ name: "Sarah", language: "en", notes: "" });
  const es = await guests.add({ name: "Pedro", language: "es", notes: "" });
  const both = "{time}|{place}|{deadline}|{link}";
  await invitations.setTemplate("en", both);
  await invitations.setTemplate("es", both);

  expect(await invitations.messageFor(en.id, { origin })).toBe(`to be announced|to be announced|to be announced|${origin}/i/${en.personalLinkCode}`);
  expect(await invitations.messageFor(es.id, { origin })).toBe(`por confirmar|por confirmar|por confirmar|${origin}/i/${es.personalLinkCode}`);
});

test("a saved template persists and changes later messages", async () => {
  const db = testDb();
  const guests = createGuestStore(db);
  const event = createEventStore(db);
  const sarah = await guests.add({ name: "Sarah", language: "en", notes: "" });
  await createInvitationStore(db, { guests, event, replies: createReplyStore(db, { guests, jev: async () => ({ picked: "none", probabilities: { none: 1 } }) }) }).setTemplate("en", "First {name} {link}");
  const invitations = createInvitationStore(db, { guests, event, replies: createReplyStore(db, { guests, jev: async () => ({ picked: "none", probabilities: { none: 1 } }) }) });
  expect(await invitations.messageFor(sarah.id, { origin })).toBe(`First Sarah ${origin}/i/${sarah.personalLinkCode}`);

  await invitations.setTemplate("en", "Second {name} {link}");

  expect(await invitations.messageFor(sarah.id, { origin })).toBe(`Second Sarah ${origin}/i/${sarah.personalLinkCode}`);
});

test("a template with an unknown placeholder or no text is rejected and the old one stays", async () => {
  const { invitations } = setup();
  const before = await invitations.getTemplate("en");

  await expect(invitations.setTemplate("en", "Hi {nmae} {link}")).rejects.toThrow(ValidationError);
  await expect(invitations.setTemplate("en", "   ")).rejects.toThrow(ValidationError);

  expect(await invitations.getTemplate("en")).toBe(before);
});

test("a template without the Personal link placeholder is rejected", async () => {
  const { invitations } = setup();

  await expect(invitations.setTemplate("en", "Hi {name}, come to the party")).rejects.toThrow(/link/i);
});

test("a Guest's name that looks like a placeholder is not expanded again", async () => {
  const { guests, invitations } = setup();
  const tricky = await guests.add({ name: "{link}", language: "en", notes: "" });
  await invitations.setTemplate("en", "Hi {name} {link}");

  expect(await invitations.messageFor(tricky.id, { origin })).toBe(`Hi {link} ${origin}/i/${tricky.personalLinkCode}`);
});

test("a message for an unknown Guest is refused", async () => {
  const { invitations } = setup();

  await expect(invitations.messageFor("gst_nope", { origin })).rejects.toThrow(/guest/i);
});

test("the list shows every active Guest with their language, Not sent until the Host shares", async () => {
  const { guests, invitations } = setup();
  const sarah = await guests.add({ name: "Sarah", language: "en", notes: "" });
  const pedro = await guests.add({ name: "Pedro", language: "es", notes: "" });
  const gone = await guests.add({ name: "Gone", language: "en", notes: "" });
  await guests.archive(gone.id);

  const rows = await invitations.overview();

  expect(rows.map((r) => [r.guestId, r.name, r.language, r.status, r.sentAt])).toEqual([
    [sarah.id, "Sarah", "en", "not_sent", null],
    [pedro.id, "Pedro", "es", "not_sent", null],
  ]);
});

test("marking an Invitation sent records when, and the Host can toggle it back by hand", async () => {
  const { guests, invitations } = setup();
  const sarah = await guests.add({ name: "Sarah", language: "en", notes: "" });

  await invitations.setSent(sarah.id, true);
  expect((await invitations.overview())[0]).toMatchObject({ status: "sent", sentAt: "2026-11-01T10:00:00.000Z" });

  await invitations.setSent(sarah.id, false);
  expect((await invitations.overview())[0]).toMatchObject({ status: "not_sent", sentAt: null });

  await invitations.setSent(sarah.id, true);
  expect((await invitations.overview())[0].status).toBe("sent");
});

test("sent status survives a restart, and an unknown Guest is refused", async () => {
  const db = testDb();
  const guests = createGuestStore(db);
  const event = createEventStore(db);
  const replies = createReplyStore(db, { guests, jev: async () => ({ picked: "none", probabilities: { none: 1 } }) });
  const sarah = await guests.add({ name: "Sarah", language: "en", notes: "" });
  await createInvitationStore(db, { guests, event, replies }).setSent(sarah.id, true);

  const again = createInvitationStore(db, { guests, event, replies });

  expect((await again.overview())[0].status).toBe("sent");
  await expect(again.setSent("gst_nope", true)).rejects.toThrow(/guest/i);
});

test("a Guest who has replied shows Replied, whether or not the Invitation was marked sent", async () => {
  const { guests, invitations, replies } = setup();
  const sarah = await guests.add({ name: "Sarah", language: "en", notes: "" });
  const pedro = await guests.add({ name: "Pedro", language: "es", notes: "" });
  await invitations.setSent(sarah.id, true);

  await replies.submitPersonal(sarah.personalLinkCode, { attending: true, partySize: 2, companions: [{ name: "Tom", kind: "adult" }] });
  await replies.submitPersonal(pedro.personalLinkCode, { attending: false, partySize: 1 });

  expect((await invitations.overview()).map((r) => r.status)).toEqual(["replied", "replied"]);
});

test("the not-replied filter leaves out Guests who have replied", async () => {
  const { guests, invitations, replies } = setup();
  const sarah = await guests.add({ name: "Sarah", language: "en", notes: "" });
  const pedro = await guests.add({ name: "Pedro", language: "es", notes: "" });
  const ana = await guests.add({ name: "Ana", language: "es", notes: "" });
  await invitations.setSent(pedro.id, true);
  await replies.submitPersonal(sarah.personalLinkCode, { attending: true, partySize: 1 });

  const rows = await invitations.overview({ notReplied: true });

  expect(rows.map((r) => [r.name, r.status])).toEqual([
    ["Pedro", "sent"],
    ["Ana", "not_sent"],
  ]);
  expect(ana.id).toBeTruthy();
});

test("send-next picks the first Guest not yet sent, passes over skipped ones and those who replied, and counts what is left", async () => {
  const { guests, invitations, replies } = setup();
  const sarah = await guests.add({ name: "Sarah", language: "en", notes: "" });
  const pedro = await guests.add({ name: "Pedro", language: "es", notes: "" });
  const ana = await guests.add({ name: "Ana", language: "es", notes: "" });
  const lu = await guests.add({ name: "Lu", language: "en", notes: "" });
  await replies.submitPersonal(sarah.personalLinkCode, { attending: true, partySize: 1 });

  expect((await invitations.nextUnsent()).next).toMatchObject({ guestId: pedro.id });

  const skipped = await invitations.nextUnsent({ skip: [pedro.id] });
  expect(skipped.next).toMatchObject({ guestId: ana.id });
  expect(skipped).toMatchObject({ remaining: 3, skippedLeft: 1 });

  await invitations.setSent(ana.id, true);
  await invitations.setSent(lu.id, true);
  const onlySkipped = await invitations.nextUnsent({ skip: [pedro.id] });
  expect(onlySkipped).toMatchObject({ next: null, remaining: 1, skippedLeft: 1 });

  await invitations.setSent(pedro.id, true);
  expect(await invitations.nextUnsent()).toMatchObject({ next: null, remaining: 0, skippedLeft: 0 });
});

test("a one-off edit changes only that Guest's message, not the template or other Guests", async () => {
  const { guests, invitations } = setup();
  const sarah = await guests.add({ name: "Sarah", language: "en", notes: "" });
  const tom = await guests.add({ name: "Tom", language: "en", notes: "" });
  await invitations.setTemplate("en", "Hi {name} {link}");

  await invitations.setMessage(sarah.id, `Sarah, you absolute legend! ${origin}/i/${sarah.personalLinkCode}`);

  expect(await invitations.messageFor(sarah.id, { origin })).toBe(`Sarah, you absolute legend! ${origin}/i/${sarah.personalLinkCode}`);
  expect(await invitations.messageFor(tom.id, { origin })).toBe(`Hi Tom ${origin}/i/${tom.personalLinkCode}`);
  expect(await invitations.getTemplate("en")).toBe("Hi {name} {link}");
  expect((await invitations.overview()).map((r) => r.hasCustomMessage)).toEqual([true, false]);
});

test("a one-off edit survives a restart and a resend, which keeps the same message and updates the sent time", async () => {
  const db = testDb();
  const guests = createGuestStore(db);
  const event = createEventStore(db);
  const replies = createReplyStore(db, { guests, jev: async () => ({ picked: "none", probabilities: { none: 1 } }) });
  const clock = { now: new Date("2026-11-01T10:00:00Z") };
  const sarah = await guests.add({ name: "Sarah", language: "en", notes: "" });
  const text = `Custom for Sarah ${origin}/i/${sarah.personalLinkCode}`;
  const first = createInvitationStore(db, { guests, event, replies, now: () => clock.now });
  await first.setMessage(sarah.id, text);
  await first.setSent(sarah.id, true);

  clock.now = new Date("2026-11-05T10:00:00Z");
  const again = createInvitationStore(db, { guests, event, replies, now: () => clock.now });
  await again.setSent(sarah.id, true);

  expect(await again.messageFor(sarah.id, { origin })).toBe(text);
  expect((await again.overview())[0].sentAt).toBe("2026-11-05T10:00:00.000Z");
  expect((await again.overview())[0].status).toBe("sent");
});

test("a one-off edit keeps its text when the main template changes later; reset restores the template-built message", async () => {
  const { guests, invitations } = setup();
  const sarah = await guests.add({ name: "Sarah", language: "en", notes: "" });
  await invitations.setTemplate("en", "Old {name} {link}");
  await invitations.setMessage(sarah.id, `Mine ${origin}/i/${sarah.personalLinkCode}`);
  await invitations.setTemplate("en", "New {name} {link}");

  expect(await invitations.messageFor(sarah.id, { origin })).toBe(`Mine ${origin}/i/${sarah.personalLinkCode}`);

  await invitations.resetMessage(sarah.id);

  expect(await invitations.messageFor(sarah.id, { origin })).toBe(`New Sarah ${origin}/i/${sarah.personalLinkCode}`);
  expect((await invitations.overview())[0].hasCustomMessage).toBe(false);
});

test("reset keeps the sent status; a one-off edit keeps it too", async () => {
  const { guests, invitations } = setup();
  const sarah = await guests.add({ name: "Sarah", language: "en", notes: "" });
  await invitations.setSent(sarah.id, true);
  await invitations.setMessage(sarah.id, `x ${origin}/i/${sarah.personalLinkCode}`);
  expect((await invitations.overview())[0].status).toBe("sent");
  await invitations.resetMessage(sarah.id);
  expect((await invitations.overview())[0].status).toBe("sent");
});

test("a one-off message must be non-empty, not too long, keep the Guest's Personal link, and be for a real Guest", async () => {
  const { guests, invitations } = setup();
  const sarah = await guests.add({ name: "Sarah", language: "en", notes: "" });

  await expect(invitations.setMessage(sarah.id, "   ")).rejects.toThrow(ValidationError);
  await expect(invitations.setMessage(sarah.id, "no link here")).rejects.toThrow(/link/i);
  await expect(invitations.setMessage(sarah.id, `${"a".repeat(2001)} /i/${sarah.personalLinkCode}`)).rejects.toThrow(/2000/);
  await expect(invitations.setMessage("gst_nope", "x")).rejects.toThrow(/guest/i);
  await expect(invitations.resetMessage("gst_nope")).rejects.toThrow(/guest/i);
});
