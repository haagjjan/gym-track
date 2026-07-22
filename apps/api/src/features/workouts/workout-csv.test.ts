import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseWorkoutCsv, unparseWorkoutCsv, workoutCsvColumns } from "./workout-csv.js";

describe("workout CSV parsing", () => {
  it("parses and groups canonical workout CSV rows", () => {
    const result = parseWorkoutCsv(
      unparseWorkoutCsv([
        {
          workout_started_at: "2026-05-20T10:00:00.000Z",
          workout_ended_at: "2026-05-20T11:00:00.000Z",
          workout_type: "upper",
          workout_title: "Upper A",
          workout_notes: "",
          exercise_name: "Bench Press",
          primary_muscle_group_slug: "chest",
          equipment: "barbell",
          exercise_type: "compound",
          exercise_position: "1",
          set_order: "1",
          set_type: "working",
          weight_kg: "80",
          reps: "8",
          rir: "2",
          rest_time_seconds: "120",
          set_note: ""
        },
        {
          workout_started_at: "2026-05-20T10:00:00.000Z",
          workout_ended_at: "2026-05-20T11:00:00.000Z",
          workout_type: "upper",
          workout_title: "Upper A",
          workout_notes: "",
          exercise_name: "Bench Press",
          primary_muscle_group_slug: "chest",
          equipment: "barbell",
          exercise_type: "compound",
          exercise_position: "1",
          set_order: "2",
          set_type: "warmup",
          weight_kg: "60.5",
          reps: "10",
          rir: "4",
          rest_time_seconds: "",
          set_note: "Easy"
        }
      ])
    );

    assert.equal(result.ok, true);

    if (!result.ok) {
      return;
    }

    assert.equal(result.rows.length, 2);
    assert.equal(result.workouts.length, 1);
    assert.equal(result.workouts[0]?.exercises[0]?.sets.length, 2);
    assert.equal(result.workouts[0]?.exercises[0]?.sets[0]?.weightKg, "80.00");
    assert.equal(result.workouts[0]?.exercises[0]?.sets[1]?.weightKg, "60.50");
  });

  it("reports row-level validation errors before grouping", () => {
    const result = parseWorkoutCsv(
      unparseWorkoutCsv([
        {
          workout_started_at: "not-a-date",
          workout_ended_at: "2026-05-20T11:00:00.000Z",
          workout_type: "",
          workout_title: "",
          workout_notes: "",
          exercise_name: "",
          primary_muscle_group_slug: "unknown",
          equipment: "",
          exercise_type: "",
          exercise_position: "1",
          set_order: "1",
          set_type: "drop",
          weight_kg: "0",
          reps: "8",
          rir: "11",
          rest_time_seconds: "",
          set_note: ""
        }
      ])
    );

    assert.equal(result.ok, false);

    if (result.ok) {
      return;
    }

    assert.deepEqual(
      result.errors.map((error) => [error.row, error.field]),
      [
        [2, "workout_started_at"],
        [2, "exercise_name"],
        [2, "set_type"],
        [2, "weight_kg"],
        [2, "rir"]
      ]
    );
  });

  it("rejects non-canonical headers and duplicate set order", () => {
    const validRow = [
      "2026-05-20T10:00:00.000Z",
      "2026-05-20T11:00:00.000Z",
      "",
      "",
      "",
      "Bench Press",
      "chest",
      "",
      "",
      "1",
      "1",
      "working",
      "80",
      "8",
      "2",
      "",
      ""
    ].join(",");
    const result = parseWorkoutCsv([workoutCsvColumns.join(","), validRow, validRow].join("\n"));

    assert.equal(result.ok, false);

    if (result.ok) {
      return;
    }

    assert.equal(result.errors[0]?.field, "set_order");
  });

  it("groups multiple workouts and sorts out-of-order exercise and set rows", () => {
    const result = parseWorkoutCsv(
      unparseWorkoutCsv([
        csvRow({ exercise_name: "Squat", exercise_position: "2" }),
        csvRow({ set_order: "2" }),
        csvRow(),
        csvRow({
          workout_started_at: "2026-05-21T10:00:00.000Z",
          workout_ended_at: "2026-05-21T11:00:00.000Z"
        })
      ])
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.workouts.length, 2);
    assert.deepEqual(
      result.workouts[0]?.exercises.map((exercise) => exercise.name),
      ["Bench Press", "Squat"]
    );
    assert.deepEqual(
      result.workouts[0]?.exercises[0]?.sets.map((set) => set.setOrder),
      [1, 2]
    );
  });
});

type WorkoutCsvInputRow = Parameters<typeof unparseWorkoutCsv>[0][number];

function csvRow(overrides: Partial<WorkoutCsvInputRow> = {}): WorkoutCsvInputRow {
  return {
    workout_started_at: "2026-05-20T10:00:00.000Z",
    workout_ended_at: "2026-05-20T11:00:00.000Z",
    workout_type: "upper",
    workout_title: "Upper A",
    workout_notes: "",
    exercise_name: "Bench Press",
    primary_muscle_group_slug: "chest",
    equipment: "barbell",
    exercise_type: "compound",
    exercise_position: "1",
    set_order: "1",
    set_type: "working",
    weight_kg: "80",
    reps: "8",
    rir: "2",
    rest_time_seconds: "120",
    set_note: "",
    ...overrides
  };
}
