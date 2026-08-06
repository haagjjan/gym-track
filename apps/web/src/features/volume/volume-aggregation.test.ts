import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { WeeklyVolumePayload } from "../../shared/api/types";
import { aggregateVolume } from "./volume-aggregation";

describe("weekly volume aggregation", () => {
  it("sums exercises, de-duplicates sessions, and identifies the latest week", () => {
    const payload: WeeklyVolumePayload = {
      weeks: [
        week("2026-07-06", 5, [
          exercise("bench", "Bench Press", 2),
          exercise("fly", "Cable Fly", 3)
        ], [session("workout-1", "2026-07-07T10:00:00.000Z", 5)]),
        week("2026-07-13", 3, [exercise("bench", "Bench Press", 3)], [
          session("workout-2", "2026-07-14T10:00:00.000Z", 3),
          session("workout-1", "2026-07-07T10:00:00.000Z", 5)
        ])
      ]
    };

    const chest = aggregateVolume(payload, 2).get("chest");

    assert.ok(chest);
    assert.equal(chest.totalSets, 8);
    assert.equal(chest.weeklyAvg, 4);
    assert.equal(chest.latestWeekSets, 3);
    assert.deepEqual(chest.exercises, [
      { id: "bench", name: "Bench Press", sets: 5 },
      { id: "fly", name: "Cable Fly", sets: 3 }
    ]);
    assert.deepEqual(chest.sessions.map((item) => item.workoutId), ["workout-2", "workout-1"]);
  });
});

function week(
  weekStart: string,
  workingSets: number,
  exercises: WeeklyVolumePayload["weeks"][number]["items"][number]["exercises"],
  recentSessions: WeeklyVolumePayload["weeks"][number]["items"][number]["recentSessions"]
): WeeklyVolumePayload["weeks"][number] {
  return {
    weekStart,
    weekEnd: weekStart,
    items: [
      {
        muscleGroup: { id: "chest-id", slug: "chest", name: "Chest" },
        workingSets,
        exercises,
        recentSessions
      }
    ]
  };
}

function exercise(id: string, name: string, workingSets: number) {
  return { id, name, workingSets };
}

function session(workoutId: string, sessionDate: string, workingSets: number) {
  return { workoutId, sessionDate, workingSets };
}
