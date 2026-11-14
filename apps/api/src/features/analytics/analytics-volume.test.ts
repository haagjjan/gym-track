import assert from "node:assert/strict";
import { test } from "node:test";
import { toWeeklyVolume } from "./analytics-weekly-volume.js";
import type { WeeklyVolumeSetRecord } from "./analytics.repository.js";
import { addTimedRegionVolume } from "../tracking/tracking-region-volume.js";

const muscle = { id: "triceps", name: "Triceps", slug: "triceps", sortOrder: 1 };
const base: WeeklyVolumeSetRecord = { workoutId: "one", sessionDate: new Date("2026-11-10T12:00:00Z"), exercise: { id: "press", name: "Chest press" }, muscleGroup: muscle, muscleRole: "SECONDARY" };

test("primary sets get full credit and secondary sets get half in every breakdown", () => {
  const volume = toWeeklyVolume([base, base, { ...base, muscleRole: "PRIMARY", exercise: { id: "extension", name: "Triceps extension" } }]);
  const item = volume.weeks[0]!.items[0]!;
  assert.equal(item.workingSets, 2);
  assert.deepEqual(item.exercises.map((entry) => entry.workingSets), [1, 1]);
  assert.equal(item.recentSessions[0]!.workingSets, 2);
  const single = toWeeklyVolume([base]).weeks[0]!.items[0]!;
  assert.equal(single.workingSets, 0.5);
  assert.equal(single.exercises[0]!.workingSets, 0.5);
  assert.equal(single.recentSessions[0]!.workingSets, 0.5);
});

test("timed region credits merge with strength credits without rounding or duplication", () => {
  const region = { ...muscle, muscleGroupSlug: "triceps" };
  const row = { ...base, muscleRegion: region };
  const combined = addTimedRegionVolume(toWeeklyVolume([base], [row]), [row]);
  const item = combined.weeks[0]!.regionItems[0]!;
  assert.equal(item.workingSets, 1);
  assert.equal(item.exercises[0]!.workingSets, 1);
  assert.equal(item.recentSessions[0]!.workingSets, 1);
});
