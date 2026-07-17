import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { groupCompletedExercises, type CompletedExerciseRow } from "./analytics-exercise-list.repository.js";

describe("completed exercise analytics grouping", () => {
  it("counts one plotted working set per user-local calendar day", () => {
    const rows = [
      row({ sessionDate: new Date("2026-07-10T22:30:00.000Z") }),
      row({ sessionDate: new Date("2026-07-11T01:00:00.000Z") }),
      row({ sessionDate: new Date("2026-07-11T22:30:00.000Z"), setType: "warmup" })
    ];

    const result = groupCompletedExercises(rows, new Map(), "Europe/Zurich");

    assert.equal(result[0]?.plottedSetCount, 1);
    assert.equal(result[0]?.totalSets, 3);
  });
});

function row(overrides: Partial<CompletedExerciseRow>): CompletedExerciseRow {
  return {
    exerciseId: "exercise-1",
    exerciseName: "Bench Press",
    sessionDate: new Date("2026-07-10T10:00:00.000Z"),
    setType: "working",
    primaryMuscleGroupId: "muscle-1",
    primaryMuscleGroupSlug: "chest",
    primaryMuscleGroupName: "Chest",
    primaryMuscleGroupSortOrder: 1,
    ...overrides
  };
}
