import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ExerciseProgressItem } from "../../shared/api/types";
import { selectBestWorkingSets } from "./progress-selection";

const sessionDate = "2026-07-10T10:00:00.000Z";

function set(
  setId: string,
  workoutId: string,
  weightKg: string,
  reps: number,
  rir: number,
  estimatedOneRepMaxKg: string,
  setType: "working" | "warmup" = "working",
  date = sessionDate
): ExerciseProgressItem {
  return {
    workoutId,
    sessionExerciseId: `${workoutId}-exercise`,
    setId,
    sessionDate: date,
    setOrder: Number(setId.replace(/\D/g, "")) || 1,
    setType,
    weightKg,
    reps,
    rir,
    estimatedOneRepMaxKg
  };
}

describe("progress best-set selection", () => {
  it("selects one load/reps set per day using weight, reps, then lowest RIR", () => {
    const selected = selectBestWorkingSets(
      [
        set("set-1", "workout-1", "100", 5, 2, "116.7"),
        set("set-2", "workout-1", "100", 6, 3, "120"),
        set("set-3", "workout-1", "100", 6, 1, "120"),
        set("set-4", "workout-1", "110", 1, 4, "113.7"),
        set("set-5", "workout-1", "120", 2, 4, "128", "warmup")
      ],
      "all",
      "loadReps"
    );

    assert.deepEqual(selected.map((item) => item.setId), ["set-4"]);
  });

  it("selects highest estimated 1RM with deterministic tie-breaking", () => {
    const selected = selectBestWorkingSets(
      [
        set("set-1", "workout-1", "100", 6, 2, "120"),
        set("set-2", "workout-1", "105", 4, 3, "120"),
        set("set-3", "workout-1", "105", 4, 1, "120")
      ],
      "all",
      "estimated"
    );

    assert.deepEqual(selected.map((item) => item.setId), ["set-3"]);
  });

  it("keeps only the strongest set when separate sessions share a calendar day", () => {
    const selected = selectBestWorkingSets(
      [set("set-1", "workout-1", "80", 8, 2, "101.3"), set("set-2", "workout-2", "90", 6, 2, "108")],
      "all",
      "loadReps"
    );

    assert.deepEqual(selected.map((item) => item.setId), ["set-2"]);
  });

  it("keeps strongest sets from different calendar days", () => {
    const selected = selectBestWorkingSets(
      [
        set("set-1", "workout-1", "80", 8, 2, "101.3", "working", "2026-07-10T10:00:00.000Z"),
        set("set-2", "workout-2", "90", 6, 2, "108", "working", "2026-07-11T10:00:00.000Z")
      ],
      "all",
      "loadReps"
    );

    assert.equal(selected.length, 2);
  });
});
