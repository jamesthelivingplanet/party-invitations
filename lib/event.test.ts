import { expect, test } from "vitest";
import { testDb } from "@/test/db";
import { createEventStore, fullPlace, replyDeadlineDate, timeZoneOptions, TIME_ZONE_CHOICES, type EventSettings } from "./event";

test("a fresh event is a generic birthday party on 2030-06-15 with no time, place or deadline yet", async () => {
  const event = await createEventStore(testDb()).get();

  expect(event).toEqual({
    name: "Birthday Party",
    date: "2030-06-15",
    time: null,
    place: null,
    city: null,
    region: null,
    country: null,
    mapUrl: null,
    replyDeadlineDays: null,
    timeZone: "America/New_York",
    childName: null,
    childFirstName: null,
    theme: null,
    childAge: null,
    clothingSize: null,
    emblem: "star",
  });
});

test("event settings that were saved are still there after a restart", async () => {
  const db = testDb();
  await createEventStore(db).update({
    name: "Alex's 7th Birthday",
    date: "2026-12-20",
    time: "2:00 PM - 5:00 PM",
    place: "123 Main St",
    replyDeadlineDays: 7,
    timeZone: "America/Los_Angeles",
  });

  const afterRestart = await createEventStore(db).get();

  expect(afterRestart).toEqual({
    name: "Alex's 7th Birthday",
    date: "2026-12-20",
    time: "2:00 PM - 5:00 PM",
    place: "123 Main St",
    city: null,
    region: null,
    country: null,
    mapUrl: null,
    replyDeadlineDays: 7,
    timeZone: "America/Los_Angeles",
    childName: null,
    childFirstName: null,
    theme: null,
    childAge: null,
    clothingSize: null,
    emblem: "star",
  });
});

test("a date that is not a real YYYY-MM-DD day is rejected and changes nothing", async () => {
  const event = createEventStore(testDb());

  for (const bad of ["Dec 19", "2026-02-30", "2026-13-01", ""]) {
    await expect(event.update({ date: bad })).rejects.toThrow(/date/i);
  }

  expect((await event.get()).date).toBe("2030-06-15");
});

test("a reply deadline must be a whole number of days from 0 to 365, or empty", async () => {
  const event = createEventStore(testDb());

  for (const bad of [-1, 2.5, 366, Number.NaN]) {
    await expect(event.update({ replyDeadlineDays: bad })).rejects.toThrow(/deadline/i);
  }
  expect((await event.get()).replyDeadlineDays).toBeNull();

  await event.update({ replyDeadlineDays: 0 });
  expect((await event.get()).replyDeadlineDays).toBe(0);
  await event.update({ replyDeadlineDays: null });
  expect((await event.get()).replyDeadlineDays).toBeNull();
});

test("blank text clears the time or place back to not set", async () => {
  const event = createEventStore(testDb());
  await event.update({ time: "2 PM", place: "Park" });

  await event.update({ time: "   ", place: "" });

  expect(await event.get()).toMatchObject({ time: null, place: null });
});

test("an event name cannot be blank", async () => {
  const event = createEventStore(testDb());

  await expect(event.update({ name: "  " })).rejects.toThrow(/name/i);

  expect((await event.get()).name).toBe("Birthday Party");
});

const party = (date: string, replyDeadlineDays: number | null): EventSettings => ({
  childName: null, childFirstName: null, theme: null, childAge: null, clothingSize: null, emblem: "star",
  city: null, region: null, country: null,
  name: "Party",
  date,
  time: null,
  place: null,
  mapUrl: null,
  replyDeadlineDays,
  timeZone: "America/New_York",
});

test("the reply deadline is the event date minus the deadline days", () => {
  expect(replyDeadlineDate(party("2026-12-19", 7))).toBe("2026-12-12");
  expect(replyDeadlineDate(party("2026-12-03", 7))).toBe("2026-11-26"); // crosses a month
  expect(replyDeadlineDate(party("2026-01-02", 5))).toBe("2025-12-28"); // crosses a year
  expect(replyDeadlineDate(party("2026-12-19", 0))).toBe("2026-12-19"); // replies close on the day
});

test("there is no reply deadline until the days are set", () => {
  expect(replyDeadlineDate(party("2026-12-19", null))).toBeNull();
});

test("a time zone that does not exist is rejected and changes nothing", async () => {
  const event = createEventStore(testDb());

  await expect(event.update({ timeZone: "Nowhere/Olympus" })).rejects.toThrow(/time zone/i);

  expect((await event.get()).timeZone).toBe("America/New_York");
});

test("every offered time zone is one the event store accepts, and a saved zone outside the list is still offered", async () => {
  const store = createEventStore(testDb());
  for (const [zone] of TIME_ZONE_CHOICES) await store.update({ timeZone: zone });

  expect(timeZoneOptions("America/Chicago")).toBe(TIME_ZONE_CHOICES);
  expect(timeZoneOptions("Asia/Tokyo")[0]).toEqual(["Asia/Tokyo", "Asia/Tokyo"]);
});

test("a map link must be a real web address and can be cleared", async () => {
  const event = createEventStore(testDb());
  await expect(event.update({ mapUrl: "not a link" })).rejects.toThrow(/map link/i);
  await expect(event.update({ mapUrl: "javascript:alert(1)" })).rejects.toThrow(/map link/i);
  await event.update({ mapUrl: " https://maps.app.goo.gl/abc " });
  expect((await event.get()).mapUrl).toBe("https://maps.app.goo.gl/abc");
  await event.update({ mapUrl: "" });
  expect((await event.get()).mapUrl).toBeNull();
});

test("the birthday child's details are saved, trimmed, and can be cleared", async () => {
  const event = createEventStore(testDb());
  await event.update({ childName: " Alex Morgan Smith ", childFirstName: "Alex", theme: "Dinosaurs", childAge: 4, clothingSize: "6", emblem: "planet" });
  expect(await event.get()).toMatchObject({
    childName: "Alex Morgan Smith", childFirstName: "Alex", theme: "Dinosaurs", childAge: 4, clothingSize: "6", emblem: "planet",
  });
  await event.update({ childName: "", theme: " ", childAge: null, clothingSize: "" });
  expect(await event.get()).toMatchObject({ childName: null, theme: null, childAge: null, clothingSize: null });
});

test("the child's age and the emblem must be real choices", async () => {
  const event = createEventStore(testDb());
  await expect(event.update({ childAge: -1 })).rejects.toThrow(/age/i);
  await expect(event.update({ childAge: 2.5 })).rejects.toThrow(/age/i);
  await expect(event.update({ emblem: "skull" as never })).rejects.toThrow(/emblem/i);
});

test("the full place adds city, state and country after the place name, skipping any left empty", () => {
  const base = { place: "El Patio de mi Casa", city: "Ensenada", region: "Baja California", country: "Mexico" };
  expect(fullPlace(base)).toBe("El Patio de mi Casa, Ensenada, Baja California, Mexico");
  expect(fullPlace({ ...base, region: null })).toBe("El Patio de mi Casa, Ensenada, Mexico");
  expect(fullPlace({ ...base, place: null })).toBeNull();
});
