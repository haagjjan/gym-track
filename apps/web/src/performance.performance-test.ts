import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { test } from "node:test";
import type {
  ExerciseProgressItem,
  WeeklyVolumePayload
} from "./shared/api/types";
import { selectBestWorkingSets } from "./features/progress/progress-selection";
import { aggregateVolume } from "./features/volume/volume-aggregation";

const PROGRESS_BUDGET_MS = 750;
const VOLUME_BUDGET_MS = 750;

test("daily Progress selection stays within its regression budget", () => {
  const items = progressItems(100_000);
  const measured = measureMedian(() =>
    selectBestWorkingSets(items, "all", "loadReps")
  );

  assert.equal(measured.result.length, 292);
  assert.ok(
    measured.medianMs <= PROGRESS_BUDGET_MS,
    `Progress selection median ${measured.medianMs.toFixed(1)}ms exceeded ${PROGRESS_BUDGET_MS}ms`
  );
});

test("high-cardinality Volume aggregation stays within its regression budget", () => {
  const payload = volumePayload();
  const measured = measureMedian(() => aggregateVolume(payload, 52));
  const exerciseCount = [...measured.result.values()].reduce(
    (total, aggregate) => total + aggregate.exercises.length,
    0
  );

  assert.equal(measured.result.size, 12);
  assert.equal(exerciseCount, 52 * 12 * 40);
  assert.ok(
    measured.medianMs <= VOLUME_BUDGET_MS,
    `Volume aggregation median ${measured.medianMs.toFixed(1)}ms exceeded ${VOLUME_BUDGET_MS}ms`
  );
});

function progressItems(count: number): ExerciseProgressItem[] {
  const firstDay = Date.parse("2026-01-01T12:00:00.000Z");
  return Array.from({ length: count }, (_, index) => ({
    workoutId: `workout-${index}`,
    sessionExerciseId: `session-exercise-${index}`,
    setId: `set-${index}`,
    sessionDate: new Date(firstDay + (index % 365) * 86_400_000).toISOString(),
    setOrder: (index % 5) + 1,
    setType: index % 5 === 0 ? "warmup" : "working",
    weightKg: String(50 + (index % 100)),
    reps: 5 + (index % 10),
    rir: index % 4,
    estimatedOneRepMaxKg: String(60 + (index % 120))
  }));
}

function volumePayload(): WeeklyVolumePayload {
  const firstWeek = Date.parse("2025-01-06T00:00:00.000Z");
  return {
    weeks: Array.from({ length: 52 }, (_, weekIndex) => {
      const weekStart = new Date(firstWeek + weekIndex * 7 * 86_400_000)
        .toISOString()
        .slice(0, 10);
      return {
        weekStart,
        weekEnd: weekStart,
        items: Array.from({ length: 12 }, (_, muscleIndex) => ({
          muscleGroup: {
            id: `muscle-${muscleIndex}`,
            slug: `muscle-${muscleIndex}`,
            name: `Muscle ${muscleIndex}`
          },
          workingSets: (weekIndex + muscleIndex) % 20 + 1,
          exercises: Array.from({ length: 40 }, (_, exerciseIndex) => ({
            id: `exercise-${weekIndex}-${muscleIndex}-${exerciseIndex}`,
            name: `Exercise ${exerciseIndex}`,
            workingSets: (exerciseIndex % 5) + 1
          })),
          recentSessions: Array.from({ length: 20 }, (_, sessionIndex) => ({
            workoutId: `workout-${weekIndex}-${muscleIndex}-${sessionIndex}`,
            sessionDate: `${weekStart}T12:00:00.000Z`,
            workingSets: (sessionIndex % 5) + 1
          }))
        }))
      };
    })
  };
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
