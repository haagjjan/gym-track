import assert from "node:assert/strict";
import { test } from "node:test";
import { formatClock, formatDate, formatDay, formatMinutes, formatTimestamp } from "./format";

test("formatClock reads like a stopwatch", () => {
  assert.equal(formatClock(0), "0:00");
  assert.equal(formatClock(245), "4:05");
  assert.equal(formatClock(3729), "1:02:09");
  assert.equal(formatClock(-5), "0:00");
});

test("formatMinutes writes durations in words", () => {
  const start = "2026-08-31T18:00:00.000Z";
  assert.equal(formatMinutes(start, "2026-08-31T18:45:00.000Z"), "45 min");
  assert.equal(formatMinutes(start, "2026-08-31T19:12:00.000Z"), "1 h 12 min");
  assert.equal(formatMinutes(start, "2026-08-31T20:00:00.000Z"), "2 h");
});

test("formatDay uses relative words, then weekday and date", () => {
  const now = new Date(2026, 7, 31, 20, 0);
  assert.equal(formatDay(new Date(2026, 7, 31, 8, 0).toISOString(), now), "Today");
  assert.equal(formatDay(new Date(2026, 7, 30, 23, 0).toISOString(), now), "Yesterday");
  assert.equal(formatDay(new Date(2026, 7, 24, 9, 0).toISOString(), now), "Mon 24 Aug");
  assert.equal(formatDay(new Date(2025, 7, 25, 9, 0).toISOString(), now), "Mon 25 Aug 2025");
});

test("formatDate and formatTimestamp always show the year", () => {
  const local = new Date(2026, 10, 9, 14, 3).toISOString();

  assert.equal(formatDate(local), "9 Nov 2026");
  assert.equal(formatTimestamp(local), "9 Nov 2026, 14:03");
});
