import assert from "node:assert/strict";
import { test } from "node:test";
import { trackingChoices, trackingDays, trackingRange, type ProgressEntry } from "./tracking-progress-data";
import type { TimedEntry, CardioEntry } from "./tracking-types";

const timed = (id: string, date: string, seconds: number, weight: string | null = null, setType: "working" | "warmup" = "working"): TimedEntry => ({ id, workoutId: id, sessionDate: date, exerciseId: "hold", exerciseName: "Hold", durationSeconds: seconds, addedWeightKg: weight, setType, note: null, revision: 1 });
const cardio = (id: string, date: string, seconds: number, distance: string | null): CardioEntry => ({ id, workoutId: id, sessionDate: date, exerciseId: "run", activity: "Run", durationSeconds: seconds, distanceMetres: distance, averageHeartRate: null, calories: null, note: null, revision: 1 });
const date = (day: number, hour = 10): string => new Date(2026, 10, day, hour).toISOString();

test("plots only the best working hold per local day across workouts, in chronological order", () => {
  const entries = [timed("warm", date(2), 600, "50", "warmup"), timed("later", date(3), 50), timed("short", date(2), 30, "10"), timed("long", date(2, 18), 60, "5")];
  assert.deepEqual(trackingDays(entries, "duration").map((row) => row.id), ["long", "later"]);
  assert.deepEqual(trackingDays(entries, "load").map((row) => row.id), ["short", "later"]);
  assert.equal(trackingDays(entries, "duration")[0]?.detail, "1:00 + 5 kg");
});

test("uses the secondary measure for ties and keeps bodyweight holds valid", () => {
  const entries = [timed("a", date(2), 30), timed("b", date(2), 45), timed("c", date(2), 45, "5")];
  assert.equal(trackingDays(entries, "load")[0]?.id, "c");
  assert.equal(trackingDays(entries, "duration")[0]?.id, "c");
  assert.equal(trackingDays([timed("body", date(2), 30)], "load")[0]?.value, 0);
});

test("cardio distance chooses the longest effort, then the faster equal-distance effort", () => {
  const entries = [cardio("short", date(2), 900, "2000"), cardio("slow", date(2), 1800, "5000"), cardio("fast", date(2, 18), 1500, "5000"), cardio("missing", date(3), 2000, null)];
  assert.deepEqual(trackingDays(entries, "distance").map((row) => [row.id, row.value]), [["fast", 5]]);
  assert.deepEqual(trackingDays(entries, "duration").map((row) => row.id), ["slow", "missing"]);
});

test("daily selection is stable across response ordering and unchanged values get hollow dots", () => {
  const entries = [timed("a", date(2), 60), timed("b", date(2), 60), timed("c", date(3), 60)];
  assert.deepEqual(trackingDays(entries, "duration"), trackingDays([...entries].reverse(), "duration"));
  assert.deepEqual(trackingDays(entries, "duration").map((row) => row.changed), [true, false]);
});

test("exercise choices exclude warm-up-only exercises, preserve legacy cardio and sort by last trained", () => {
  const choices = trackingChoices({ timedSets: [timed("a", date(2), 60), timed("b", date(2), 50), { ...timed("w", date(4), 100, null, "warmup"), exerciseId: "warm-only" }], cardioEntries: [{ ...cardio("c", date(3), 60, null), exerciseId: null }] });
  assert.deepEqual(choices.map((choice) => [choice.id, choice.plottedSetCount]), [["cardio:run", 1], ["hold", 1]]);
});

test("summary ranges filter all working entries while the plot keeps its full history", () => {
  const entries: ProgressEntry[] = [timed("old", date(1), 60), timed("recent", date(12), 40), cardio("cardio", date(12), 900, null)];
  assert.equal(trackingRange(entries, "7", new Date(date(13)).getTime()).length, 2);
  assert.equal(trackingRange(entries, "all").length, 3);
  assert.equal(trackingDays(entries, "duration").length, 2);
});
