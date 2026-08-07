import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SessionExercise } from "../../shared/api/types";
import {
  SET_DRAFT_TTL_MS,
  clearSetDraft,
  clearUserSetDrafts,
  clearWorkoutSetDrafts,
  purgeExpiredSetDrafts,
  readSetDraft,
  suggestedDraft,
  writeSetDraft
} from "./set-draft-storage";

const mutationId = "11111111-1111-4111-8111-111111111111";
const nextMutationId = "22222222-2222-4222-8222-222222222222";

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

describe("set draft recovery storage", () => {
  it("round-trips a versioned draft and its stable mutation ID", () => {
    const storage = new MemoryStorage();
    const restore = installStorage(storage);
    try {
      const active = {
        clientMutationId: mutationId,
        draft: { ...suggestedDraft(null), reps: "12" },
        savedAt: 1_000
      };
      writeSetDraft("user-1", "workout-1", "session-exercise", active);
      const restored = readSetDraft(
        "user-1",
        "workout-1",
        sessionExercise(),
        2_000,
        () => nextMutationId
      );

      assert.deepEqual(restored, active);
      assert.match(storage.getItem(draftKey()) ?? "", /"version":1/);
      assert.match(storage.getItem(draftKey()) ?? "", /"savedAt":1000/);
    } finally {
      restore();
    }
  });

  it("expires a draft at the 24-hour boundary and removes it", () => {
    const storage = new MemoryStorage();
    const restore = installStorage(storage);
    try {
      const active = {
        clientMutationId: mutationId,
        draft: suggestedDraft(null),
        savedAt: 1_000
      };
      writeSetDraft("user-1", "workout-1", "session-exercise", active);
      const restored = readSetDraft(
        "user-1",
        "workout-1",
        sessionExercise(),
        1_000 + SET_DRAFT_TTL_MS,
        () => nextMutationId
      );

      assert.equal(restored.clientMutationId, nextMutationId);
      assert.equal(storage.getItem(draftKey()), null);
    } finally {
      restore();
    }
  });

  it("does not extend expiry when a draft is reopened or a save is retried", () => {
    const storage = new MemoryStorage();
    const restore = installStorage(storage);
    try {
      const active = {
        clientMutationId: mutationId,
        draft: suggestedDraft(null),
        savedAt: 1_000
      };
      writeSetDraft("user-1", "workout-1", "session-exercise", active);
      const reopened = readSetDraft(
        "user-1",
        "workout-1",
        sessionExercise(),
        1_000 + SET_DRAFT_TTL_MS / 2,
        () => nextMutationId
      );
      writeSetDraft("user-1", "workout-1", "session-exercise", reopened);
      const expired = readSetDraft(
        "user-1",
        "workout-1",
        sessionExercise(),
        1_000 + SET_DRAFT_TTL_MS,
        () => nextMutationId
      );

      assert.equal(reopened.savedAt, 1_000);
      assert.equal(reopened.clientMutationId, mutationId);
      assert.equal(expired.clientMutationId, nextMutationId);
    } finally {
      restore();
    }
  });

  it("removes malformed and legacy unversioned drafts", () => {
    const storage = new MemoryStorage();
    const restore = installStorage(storage);
    try {
      storage.setItem(draftKey(), JSON.stringify(suggestedDraft(null)));
      readSetDraft("user-1", "workout-1", sessionExercise(), 1_000, () => mutationId);
      assert.equal(storage.getItem(draftKey()), null);

      storage.setItem(draftKey(), "{not-json");
      readSetDraft("user-1", "workout-1", sessionExercise(), 1_000, () => mutationId);
      assert.equal(storage.getItem(draftKey()), null);
    } finally {
      restore();
    }
  });

  it("clears save/discard, workout completion/deletion, account/device, and expiry scopes", () => {
    const storage = new MemoryStorage();
    const restore = installStorage(storage);
    try {
      const expired = {
        clientMutationId: mutationId,
        draft: suggestedDraft(null),
        savedAt: 1_000
      };
      const current = { ...expired, savedAt: SET_DRAFT_TTL_MS };
      writeSetDraft("user-1", "workout-1", "session-exercise", expired);
      writeSetDraft("user-1", "workout-1", "other-exercise", expired);
      writeSetDraft("user-1", "workout-2", "session-exercise", expired);
      writeSetDraft("user-2", "workout-1", "session-exercise", current);

      clearSetDraft("user-1", "workout-1", "other-exercise");
      assert.equal(storage.getItem(`${draftPrefix()}other-exercise`), null);
      clearWorkoutSetDrafts("user-1", "workout-1");
      assert.equal(storage.getItem(draftKey()), null);
      assert.notEqual(storage.getItem("gym-progress:set-draft:user-1:workout-2:session-exercise"), null);

      clearUserSetDrafts("user-1");
      assert.equal(storage.getItem("gym-progress:set-draft:user-1:workout-2:session-exercise"), null);
      assert.notEqual(storage.getItem("gym-progress:set-draft:user-2:workout-1:session-exercise"), null);

      writeSetDraft("user-3", "workout-1", "session-exercise", expired);

      purgeExpiredSetDrafts(1_000 + SET_DRAFT_TTL_MS);
      assert.equal(storage.getItem("gym-progress:set-draft:user-3:workout-1:session-exercise"), null);
      assert.notEqual(storage.getItem("gym-progress:set-draft:user-2:workout-1:session-exercise"), null);
    } finally {
      restore();
    }
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

class MemoryStorage {
  private readonly values = new Map<string, string>();

  public get length(): number {
    return this.values.size;
  }

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  public removeItem(key: string): void {
    this.values.delete(key);
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function installStorage(storage: MemoryStorage): () => void {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: storage }
  });

  return () => {
    if (previous) {
      Object.defineProperty(globalThis, "window", previous);
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }
  };
}

function draftPrefix(): string {
  return "gym-progress:set-draft:user-1:workout-1:";
}

function draftKey(): string {
  return `${draftPrefix()}session-exercise`;
}
