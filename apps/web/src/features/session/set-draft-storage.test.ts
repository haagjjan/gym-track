import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SessionExercise } from "../../shared/api/types";
import { suggestedDraft } from "./set-draft-storage";

describe("set draft precedence", () => {
  it("uses previous performance for an exercise's first current-session set", () => {
    const draft = suggestedDraft(sessionExercise({
      previousPerformance: {
        workoutId: "workout-before",
        workoutTitle: "Pull day",
        workoutStartedAt: "2026-08-01T10:00:00.000Z",
        bestSet: {
          setId: "set-before",
          setOrder: 2,
          weightKg: "87.50",
          reps: 7,
          rir: 1,
          setType: "working"
        }
      }
    }));

    assert.equal(draft.weightKg, "87.5");
    assert.equal(draft.reps, "8");
  });

  it("uses the latest current-session set before previous performance", () => {
    const exercise = sessionExercise({
      sets: [
        workoutSet({ id: "set-1", weightKg: "70.00", reps: 10 }),
        workoutSet({ id: "set-2", setOrder: 2, setType: "warmup", weightKg: "75.00", reps: 6, rir: 3 })
      ],
      previousPerformance: {
        workoutId: "workout-before",
        workoutTitle: null,
        workoutStartedAt: "2026-08-01T10:00:00.000Z",
        bestSet: { setId: "old", setOrder: 1, weightKg: "100.00", reps: 5, rir: 1, setType: "working" }
      }
    });

    assert.deepEqual(suggestedDraft(exercise), {
      setType: "warmup",
      weightKg: "75",
      reps: "6",
      rir: "3",
      note: ""
    });
  });

  it("falls back to 20 kg without current or previous sets", () => {
    assert.equal(suggestedDraft(sessionExercise()).weightKg, "20");
  });
});

function sessionExercise(overrides: Partial<SessionExercise> = {}): SessionExercise {
  return {
    id: "session-exercise",
    position: 1,
    exercise: {
      id: "exercise",
      name: "Bench Press",
      equipment: "barbell",
      exerciseType: "compound",
      primaryMuscleGroup: { id: "chest", slug: "chest", name: "Chest" },
      primaryMuscleGroups: [{ id: "chest", slug: "chest", name: "Chest" }],
      secondaryMuscleGroups: [],
      muscleGroups: [{ id: "chest", slug: "chest", name: "Chest", role: "PRIMARY" }],
      createdByUserId: null,
      createdAt: "2026-08-01T10:00:00.000Z",
      updatedAt: "2026-08-01T10:00:00.000Z"
    },
    sets: [],
    previousPerformance: null,
    ...overrides
  };
}

function workoutSet(overrides: Partial<SessionExercise["sets"][number]> = {}): SessionExercise["sets"][number] {
  return {
    id: "set",
    setOrder: 1,
    setType: "working",
    weightKg: "20.00",
    reps: 8,
    rir: 2,
    restTimeSeconds: null,
    note: null,
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
    ...overrides
  };
}
