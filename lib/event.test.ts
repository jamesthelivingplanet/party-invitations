import { expect, test } from "vitest";
import { testDb } from "@/test/db";
import { createEventStore, replyDeadlineDate, type EventSettings } from "./event";

test("a fresh event is Alex's party on 2026-12-19 with no time, place or deadline yet", async () => {
  const event = await createEventStore(testDb()).get();

  expect(event).toEqual({
    name: "Alex's Birthday",
    date: "2026-12-19",
    time: null,
    place: null,
    replyDeadlineDays: null,
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
  });

  const afterRestart = await createEventStore(db).get();

  expect(afterRestart).toEqual({
    name: "Alex's 7th Birthday",
    date: "2026-12-20",
    time: "2:00 PM - 5:00 PM",
    place: "123 Main St",
    replyDeadlineDays: 7,
  });
});

test("a date that is not a real YYYY-MM-DD day is rejected and changes nothing", async () => {
  const event = createEventStore(testDb());

  for (const bad of ["Dec 19", "2026-02-30", "2026-13-01", ""]) {
    await expect(event.update({ date: bad })).rejects.toThrow(/date/i);
  }

  expect((await event.get()).date).toBe("2026-12-19");
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

  expect((await event.get()).name).toBe("Alex's Birthday");
});

const party = (date: string, replyDeadlineDays: number | null): EventSettings => ({
  name: "Party",
  date,
  time: null,
  place: null,
  replyDeadlineDays,
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
