import { expect, test } from "vitest";
import { testDb } from "@/test/db";
import { createGuestStore } from "./guests";

test("a guest added to the list shows up with their name, language and notes", async () => {
  const guests = createGuestStore(testDb());

  await guests.add({ name: "Sarah Johnson", language: "es", notes: "Mikey's mom" });

  const list = await guests.list();
  expect(list).toHaveLength(1);
  expect(list[0]).toMatchObject({
    name: "Sarah Johnson",
    language: "es",
    notes: "Mikey's mom",
    archived: false,
  });
});

test("an archived guest drops out of the list but is still kept", async () => {
  const guests = createGuestStore(testDb());
  const sarah = await guests.add({ name: "Sarah Johnson", language: "en", notes: "" });
  await guests.add({ name: "Dave Example", language: "en", notes: "" });

  await guests.archive(sarah.id);

  expect((await guests.list()).map((g) => g.name)).toEqual(["Dave Example"]);
  const everyone = await guests.list({ includeArchived: true });
  expect(everyone.find((g) => g.id === sarah.id)).toMatchObject({ name: "Sarah Johnson", archived: true });
});

test("a restored guest is back in the list", async () => {
  const guests = createGuestStore(testDb());
  const sarah = await guests.add({ name: "Sarah Johnson", language: "en", notes: "" });
  await guests.archive(sarah.id);

  await guests.restore(sarah.id);

  expect((await guests.list()).map((g) => g.name)).toEqual(["Sarah Johnson"]);
});

test("updating a guest changes only the fields given", async () => {
  const guests = createGuestStore(testDb());
  const sarah = await guests.add({ name: "Sarah Johnson", language: "en", notes: "Mikey's mom" });

  await guests.update(sarah.id, { language: "es", notes: "Mikey's mom, speaks Spanish" });

  const [after] = await guests.list();
  expect(after).toMatchObject({
    name: "Sarah Johnson",
    language: "es",
    notes: "Mikey's mom, speaks Spanish",
  });
});

test("a guest with a blank name is rejected", async () => {
  const guests = createGuestStore(testDb());

  await expect(guests.add({ name: "   ", language: "en", notes: "" })).rejects.toThrow(/name/i);

  expect(await guests.list()).toEqual([]);
});

test("a guest whose language is not English or Spanish is rejected", async () => {
  const guests = createGuestStore(testDb());

  await expect(
    guests.add({ name: "Pierre", language: "fr" as never, notes: "" }),
  ).rejects.toThrow(/language/i);

  expect(await guests.list()).toEqual([]);
});

test("a guest whose notes are over 500 characters is rejected", async () => {
  const guests = createGuestStore(testDb());

  await expect(
    guests.add({ name: "Sarah", language: "en", notes: "x".repeat(501) }),
  ).rejects.toThrow(/notes/i);

  const ok = await guests.add({ name: "Sarah", language: "en", notes: "x".repeat(500) });
  expect(ok.notes).toHaveLength(500);
});

test("an update with a blank name is rejected and changes nothing", async () => {
  const guests = createGuestStore(testDb());
  const sarah = await guests.add({ name: "Sarah Johnson", language: "en", notes: "keep me" });

  await expect(guests.update(sarah.id, { name: " ", notes: "changed" })).rejects.toThrow(/name/i);

  expect((await guests.list())[0]).toMatchObject({ name: "Sarah Johnson", notes: "keep me" });
});

test("an update cannot change anything but name, language and notes", async () => {
  const guests = createGuestStore(testDb());
  const sarah = await guests.add({ name: "Sarah Johnson", language: "en", notes: "" });

  await guests.update(sarah.id, {
    archived: true,
    id: "someone-else",
    "name = 'hacked', notes": "x",
  } as never);

  const [after] = await guests.list();
  expect(after).toMatchObject({ id: sarah.id, name: "Sarah Johnson", notes: "", archived: false });
});

const placeholders = [
  { id: "g01", name: "Michael Johnson", notes: "Alex's classmate" },
  { id: "g02", name: "Emma Rodriguez", notes: "Neighbor" },
];

test("a new guest list starts with the placeholder guests, in English", async () => {
  const guests = createGuestStore(testDb(), { seed: placeholders });

  const list = await guests.list();

  expect(list.map((g) => [g.id, g.name, g.language])).toEqual([
    ["g01", "Michael Johnson", "en"],
    ["g02", "Emma Rodriguez", "en"],
  ]);
});

test("opening an existing guest list again does not duplicate the placeholders", async () => {
  const db = testDb();
  await createGuestStore(db, { seed: placeholders }).list();

  const reopened = await createGuestStore(db, { seed: placeholders }).list();

  expect(reopened.map((g) => g.id)).toEqual(["g01", "g02"]);
});

test("placeholders the host has removed do not come back", async () => {
  const db = testDb();
  await createGuestStore(db, { seed: placeholders }).list();
  await db.execute("DELETE FROM guests"); // host replaces the list with their real one

  const reopened = await createGuestStore(db, { seed: placeholders }).list();

  expect(reopened).toEqual([]);
});

test("every guest gets their own long Personal link code", async () => {
  const guests = createGuestStore(testDb());
  const added = await guests.add({ name: "Sarah Johnson", language: "en", notes: "" });
  await guests.add({ name: "Dave Example", language: "en", notes: "" });

  const codes = (await guests.list()).map((g) => g.personalLinkCode);
  expect(new Set(codes).size).toBe(2);
  // 22 URL-safe characters carry 128 bits.
  for (const code of codes) expect(code).toMatch(/^[A-Za-z0-9_-]{22,}$/);
  expect(added.personalLinkCode).toBe(codes[0]);
});

test("guests who were on the list before Personal links existed get a code without any manual step", async () => {
  const db = testDb();
  await db.execute(`CREATE TABLE guests (id TEXT PRIMARY KEY, name TEXT NOT NULL, language TEXT NOT NULL,
    notes TEXT NOT NULL, archived INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')))`);
  await db.execute("INSERT INTO guests (id, name, language, notes) VALUES ('a', 'Old One', 'en', '')");
  await db.execute("INSERT INTO guests (id, name, language, notes) VALUES ('b', 'Old Two', 'es', '')");

  const list = await createGuestStore(db).list();

  expect(list.map((g) => g.name)).toEqual(["Old One", "Old Two"]);
  expect(list[0].personalLinkCode).toMatch(/^[A-Za-z0-9_-]{22,}$/);
  expect(list[0].personalLinkCode).not.toBe(list[1].personalLinkCode);
  // The code stays the same on the next visit.
  expect((await createGuestStore(db).list())[0].personalLinkCode).toBe(list[0].personalLinkCode);
});

test("regenerating a Personal link gives a new code and keeps the rest of the Guest", async () => {
  const guests = createGuestStore(testDb());
  const sarah = await guests.add({ name: "Sarah Johnson", language: "es", notes: "n" });
  const dave = await guests.add({ name: "Dave Example", language: "en", notes: "" });

  const fresh = await guests.regeneratePersonalLink(sarah.id);

  const list = await guests.list();
  expect(list[0]).toMatchObject({ name: "Sarah Johnson", language: "es", notes: "n", personalLinkCode: fresh });
  expect(fresh).not.toBe(sarah.personalLinkCode);
  expect(list[1].personalLinkCode).toBe(dave.personalLinkCode);
});
