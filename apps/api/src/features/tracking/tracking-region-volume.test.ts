import assert from "node:assert/strict";
import { it } from "node:test";
import { addTimedRegionVolume } from "./tracking-region-volume.js";

it("adds timed facts to existing regional payloads and preserves legacy group-only payloads", () => {
  const row = { muscleRole: "PRIMARY" as const, workoutId: "workout", sessionDate: new Date("2026-11-10T10:00:00Z"), exercise: { id: "hang", name: "Dead hang" },
    muscleRegion: { id: "region", slug: "forearms", name: "Forearms", sortOrder: 1, muscleGroupSlug: "forearms" } };
  const legacy = { weeks: [{ weekStart: "2026-11-09", items: [] }] };
  assert.deepEqual(addTimedRegionVolume(legacy, [row]), legacy);
  const volume = { weeks: [{ weekStart: "2026-11-09", regionItems: [{ muscleRegion: row.muscleRegion, workingSets: 2,
    exercises: [{ id: "hang", name: "Dead hang", workingSets: 2 }], recentSessions: [{ workoutId: "workout", sessionDate: row.sessionDate.toISOString(), workingSets: 2 }] }] }] };
  const region = addTimedRegionVolume(volume, [row]).weeks[0]!.regionItems[0]!;
  assert.equal(region.workingSets, 3); assert.equal(region.exercises[0]!.workingSets, 3); assert.equal(region.recentSessions[0]!.workingSets, 3);
});
