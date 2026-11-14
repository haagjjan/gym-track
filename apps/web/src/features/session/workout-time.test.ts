import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveWorkoutTime, toWorkoutTimeDraft } from "./workout-time";

test("same-day times give the duration in minutes", () => {
  const result = resolveWorkoutTime({ date: "2026-11-09", start: "18:05", end: "19:17" });
  assert.equal(result.ok && result.minutes, 72);
  assert.equal(result.ok && result.nextDay, false);
});

test("a finish before the start runs past midnight", () => {
  const result = resolveWorkoutTime({ date: "2026-11-09", start: "23:30", end: "00:40" });
  assert.equal(result.ok && result.minutes, 70);
  assert.equal(result.ok && result.nextDay, true);
});

test("more than 12 hours and missing fields are rejected", () => {
  assert.deepEqual(resolveWorkoutTime({ date: "2026-11-09", start: "06:00", end: "18:01" }), { ok: false, reason: "too-long" });
  assert.deepEqual(resolveWorkoutTime({ date: "", start: "06:00", end: "07:00" }), { ok: false, reason: "incomplete" });
});

test("the same start and finish is not read as a 24-hour workout", () => {
  assert.deepEqual(resolveWorkoutTime({ date: "2026-11-09", start: "22:24", end: "22:24" }), { ok: false, reason: "same-time" });
});

test("stored times round-trip through the editor fields", () => {
  const startedAt = new Date(2026, 10, 9, 18, 5).toISOString();
  const endedAt = new Date(2026, 10, 9, 19, 17).toISOString();
  const draft = toWorkoutTimeDraft(startedAt, endedAt);
  assert.deepEqual(draft, { date: "2026-11-09", start: "18:05", end: "19:17" });
  const result = resolveWorkoutTime(draft);
  assert.equal(result.ok && result.startedAt, startedAt);
  assert.equal(result.ok && result.endedAt, endedAt);
});
