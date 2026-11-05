import { expect, test } from "vitest";
import { buildIcs, googleCalendarUrl, parseTimeRange, zonedToUtc } from "./calendar";
import type { EventSettings } from "./event";

const event: EventSettings = {
  name: "Alex's Birthday", date: "2026-12-19", time: "2:00 PM - 8:00 PM", place: "Fun Park",
  mapUrl: "https://maps.example/x", replyDeadlineDays: 30, timeZone: "America/Los_Angeles",
};

test("reads common ways of writing the Time", () => {
  expect(parseTimeRange("2:00 PM - 8:00 PM")).toEqual({ start: { h: 14, m: 0 }, end: { h: 20, m: 0 } });
  expect(parseTimeRange("2-8pm")).toEqual({ start: { h: 14, m: 0 }, end: { h: 20, m: 0 } });
  expect(parseTimeRange("14:00 - 20:30")).toEqual({ start: { h: 14, m: 0 }, end: { h: 20, m: 30 } });
  expect(parseTimeRange("3 pm")).toEqual({ start: { h: 15, m: 0 }, end: null });
  expect(parseTimeRange("12:00 AM")?.start).toEqual({ h: 0, m: 0 });
  expect(parseTimeRange("afternoon")).toBeNull();
  expect(parseTimeRange(null)).toBeNull();
});

test("wall-clock time converts to UTC with daylight saving", () => {
  expect(zonedToUtc("2026-12-19", { h: 14, m: 0 }, "America/Los_Angeles").toISOString()).toBe("2026-12-19T22:00:00.000Z");
  expect(zonedToUtc("2026-07-19", { h: 14, m: 0 }, "America/Los_Angeles").toISOString()).toBe("2026-07-19T21:00:00.000Z");
});

test("the calendar file has the party's start, end and place", () => {
  const ics = buildIcs(event, new Date("2026-11-05T00:00:00Z"));
  expect(ics).toContain("DTSTART:20261219T220000Z");
  expect(ics).toContain("DTEND:20261220T040000Z");
  expect(ics).toContain("LOCATION:Fun Park");
  expect(ics).toContain("SUMMARY:Alex's Birthday");
});

test("an unreadable Time becomes an all-day event", () => {
  const ics = buildIcs({ ...event, time: null }, new Date("2026-11-05T00:00:00Z"));
  expect(ics).toContain("DTSTART;VALUE=DATE:20261219");
  expect(ics).toContain("DTEND;VALUE=DATE:20261220");
  expect(googleCalendarUrl({ ...event, time: "TBD" })).toContain("dates=20261219%2F20261220");
});

test("the Google Calendar link carries the title, times and location", () => {
  const url = new URL(googleCalendarUrl(event));
  expect(url.searchParams.get("text")).toBe("Alex's Birthday");
  expect(url.searchParams.get("dates")).toBe("20261219T220000Z/20261220T040000Z");
  expect(url.searchParams.get("location")).toBe("Fun Park");
});
