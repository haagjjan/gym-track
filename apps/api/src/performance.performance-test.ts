import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { test } from "node:test";
import { evaluateExerciseName } from "./features/exercises/exercise-name-quality.js";
import {
  MAX_CSV_IMPORT_ROWS,
  parseWorkoutCsv,
  unparseWorkoutCsv
} from "./features/workouts/workout-csv.js";

const CSV_BUDGET_MS = 750;
const EXERCISE_NAMES_BUDGET_MS = 2_000;

test("maximum-size canonical CSV parsing stays within its regression budget", () => {
  const csv = unparseWorkoutCsv(
    Array.from({ length: MAX_CSV_IMPORT_ROWS }, (_, index) => csvRow(index + 1))
  );
  const measured = measureMedian(() => parseWorkoutCsv(csv));

  assert.equal(measured.result.ok, true);
  if (!measured.result.ok) return;
  assert.equal(measured.result.rows.length, MAX_CSV_IMPORT_ROWS);
  assert.equal(measured.result.workouts.length, 1);
  assert.ok(
    measured.medianMs <= CSV_BUDGET_MS,
    `CSV parsing median ${measured.medianMs.toFixed(1)}ms exceeded ${CSV_BUDGET_MS}ms`
  );
});

test("exercise-name evaluation stays within its regression budget", () => {
  const names = Array.from(
    { length: 1_000 },
    (_, index) => `Incline Dumbell Press Variation ${alphabeticSuffix(index)}`
  );
  const measured = measureMedian(() =>
    names.map((name) => evaluateExerciseName(name))
  );

  assert.equal(measured.result.length, names.length);
  assert.ok(measured.result.every((result) => result.status === "warn"));
  assert.ok(
    measured.medianMs <= EXERCISE_NAMES_BUDGET_MS,
    `Name evaluation median ${measured.medianMs.toFixed(1)}ms exceeded ${EXERCISE_NAMES_BUDGET_MS}ms`
  );
});

type WorkoutCsvInputRow = Parameters<typeof unparseWorkoutCsv>[0][number];

function csvRow(setOrder: number): WorkoutCsvInputRow {
  return {
    workout_started_at: "2026-05-20T10:00:00.000Z",
    workout_ended_at: "2026-05-20T11:00:00.000Z",
    workout_type: "upper",
    workout_title: "Performance fixture",
    workout_notes: "",
    exercise_name: "Bench Press",
    primary_muscle_group_slug: "chest",
    equipment: "barbell",
    exercise_type: "compound",
    exercise_position: "1",
    set_order: String(setOrder),
    set_type: "working",
    weight_kg: "80",
    reps: "8",
    rir: "2",
    rest_time_seconds: "120",
    set_note: ""
  };
}

function alphabeticSuffix(value: number): string {
  let remaining = value;
  let suffix = "";

  do {
    suffix = String.fromCharCode(97 + (remaining % 26)) + suffix;
    remaining = Math.floor(remaining / 26) - 1;
  } while (remaining >= 0);

  return suffix;
}

function measureMedian<T>(run: () => T): { medianMs: number; result: T } {
  run();
  const samples: number[] = [];
  let result = run();

  for (let sample = 0; sample < 3; sample += 1) {
    const startedAt = performance.now();
    result = run();
    samples.push(performance.now() - startedAt);
  }

  samples.sort((left, right) => left - right);
  return { medianMs: samples[1]!, result };
}
