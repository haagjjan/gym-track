import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  SelectableExerciseRecord,
  SessionExerciseRecord,
  SetRecord,
  WorkoutLoggingRepository
} from "./workout-logging.repository.js";
import type { AddSetRequest, UpdateSetRequest } from "./workout-logging.schemas.js";
import { createWorkoutLoggingService } from "./workout-logging.service.js";

const now = new Date("2026-05-20T12:00:00.000Z");
const createdAt = new Date("2026-05-20T10:00:00.000Z");
const workoutId = "workout-1";
const sessionExerciseId = "session-exercise-1";
const exerciseId = "exercise-1";
const setId = "set-1";

type AddedSessionExercise = { id: string; workoutId: string; exerciseId: string; position: number };
type ReorderedExercises = {
  workoutId: string;
  items: { sessionExerciseId: string; position: number }[];
  updatedAt: Date;
};
type DeletedSessionExercise = { workoutId: string; sessionExerciseId: string; deletedAt: Date };
type SessionExerciseExistsCall = { userId: string; workoutId: string; sessionExerciseId: string };
type AddedSet = { id: string; sessionExerciseId: string; setOrder: number; values: AddSetRequest };
type UpdatedSet = { setId: string; input: UpdateSetRequest; updatedAt: Date };

class FakeWorkoutLoggingRepository implements WorkoutLoggingRepository {
  public workoutExistsCall: { userId: string; workoutId: string } | null = null;
  public addedSessionExercise: AddedSessionExercise | null = null;
  public reordered: ReorderedExercises | null = null;
  public deletedSessionExercise: DeletedSessionExercise | null = null;
  public sessionExerciseExistsCall: SessionExerciseExistsCall | null = null;
  public addedSet: AddedSet | null = null;
  public setExistsCall: { userId: string; setId: string } | null = null;
  public updatedSet: UpdatedSet | null = null;
  public deletedSet: { setId: string; deletedAt: Date } | null = null;

  public constructor(
    public workoutVisible = true,
    public selectableExercise: SelectableExerciseRecord | null = exerciseRecord(),
    public sessionExerciseCount = 2,
    public sessionExerciseIds = ["session-exercise-1", "session-exercise-2"],
    public sessionExerciseVisible = true,
    public setCount = 1,
    public visibleSet: SetRecord | null = setRecord(),
    public deleteSessionExerciseResult = true,
    public deleteSetResult = true
  ) {}

  public async workoutExists(userId: string, currentWorkoutId: string): Promise<boolean> {
    this.workoutExistsCall = { userId, workoutId: currentWorkoutId };

    return this.workoutVisible;
  }

  public async findSelectableExercise(): Promise<SelectableExerciseRecord | null> {
    return this.selectableExercise;
  }

  public async countSessionExercises(): Promise<number> {
    return this.sessionExerciseCount;
  }

  public async addSessionExercise(input: {
    id: string;
    workoutId: string;
    exerciseId: string;
    position: number;
  }): Promise<SessionExerciseRecord> {
    this.addedSessionExercise = input;

    return sessionExerciseRecord({
      id: input.id,
      position: input.position
    });
  }

  public async listSessionExerciseIds(): Promise<string[]> {
    return this.sessionExerciseIds;
  }

  public async reorderSessionExercises(
    currentWorkoutId: string,
    items: { sessionExerciseId: string; position: number }[],
    updatedAt: Date
  ): Promise<void> {
    this.reordered = {
      workoutId: currentWorkoutId,
      items,
      updatedAt
    };
  }

  public async deleteSessionExercise(
    currentWorkoutId: string,
    currentSessionExerciseId: string,
    deletedAt: Date
  ): Promise<boolean> {
    this.deletedSessionExercise = {
      workoutId: currentWorkoutId,
      sessionExerciseId: currentSessionExerciseId,
      deletedAt
    };

    return this.deleteSessionExerciseResult;
  }

  public async sessionExerciseExists(
    userId: string,
    currentWorkoutId: string,
    currentSessionExerciseId: string
  ): Promise<boolean> {
    this.sessionExerciseExistsCall = {
      userId,
      workoutId: currentWorkoutId,
      sessionExerciseId: currentSessionExerciseId
    };

    return this.sessionExerciseVisible;
  }

  public async countSets(): Promise<number> {
    return this.setCount;
  }

  public async addSet(input: {
    id: string;
    sessionExerciseId: string;
    setOrder: number;
    values: AddSetRequest;
  }): Promise<SetRecord> {
    this.addedSet = input;

    return setRecord({
      id: input.id,
      sessionExerciseId: input.sessionExerciseId,
      setOrder: input.setOrder,
      setType: input.values.setType,
      weightKg: input.values.weightKg,
      reps: input.values.reps,
      rir: input.values.rir,
      restTimeSeconds: input.values.restTimeSeconds ?? null,
      note: input.values.note ?? null
    });
  }

  public async setExists(userId: string, currentSetId: string): Promise<SetRecord | null> {
    this.setExistsCall = { userId, setId: currentSetId };

    return this.visibleSet;
  }

  public async updateSet(
    currentSetId: string,
    input: UpdateSetRequest,
    updatedAt: Date
  ): Promise<SetRecord> {
    this.updatedSet = {
      setId: currentSetId,
      input,
      updatedAt
    };

    return setRecord({
      id: currentSetId,
      setOrder: this.visibleSet?.setOrder ?? 1,
      setType: input.setType ?? this.visibleSet?.setType ?? "working",
      weightKg: input.weightKg ?? this.visibleSet?.weightKg ?? "80.00",
      reps: input.reps ?? this.visibleSet?.reps ?? 8,
      rir: input.rir ?? this.visibleSet?.rir ?? 2,
      restTimeSeconds: input.restTimeSeconds ?? this.visibleSet?.restTimeSeconds ?? null,
      note: input.note ?? this.visibleSet?.note ?? null,
      updatedAt
    });
  }

  public async deleteSet(currentSetId: string, deletedAt: Date): Promise<boolean> {
    this.deletedSet = { setId: currentSetId, deletedAt };

    return this.deleteSetResult;
  }
}

describe("workout logging service", () => {
  it("adds an exercise at the appended position by default", async () => {
    const repository = new FakeWorkoutLoggingRepository();
    const service = createWorkoutLoggingService({ repository, now: () => now });
    const result = await service.addSessionExercise("user-1", workoutId, { exerciseId });

    assert.equal(result.ok, true);
    assert.deepEqual(repository.workoutExistsCall, { userId: "user-1", workoutId });
    assert.equal(repository.addedSessionExercise?.workoutId, workoutId);
    assert.equal(repository.addedSessionExercise?.exerciseId, exerciseId);
    assert.equal(repository.addedSessionExercise?.position, 3);

    if (result.ok) {
      assert.equal(result.value.position, 3);
      assert.deepEqual(result.value.sets, []);
    }
  });

  it("rejects exercise positions outside the compact range", async () => {
    const repository = new FakeWorkoutLoggingRepository();
    const service = createWorkoutLoggingService({ repository, now: () => now });
    const result = await service.addSessionExercise("user-1", workoutId, {
      exerciseId,
      position: 4
    });

    assert.deepEqual(result, { ok: false, reason: "invalid_order" });
    assert.equal(repository.addedSessionExercise, null);
  });

  it("returns not found for invisible workouts or unavailable exercises", async () => {
    const repository = new FakeWorkoutLoggingRepository(false, null);
    const service = createWorkoutLoggingService({ repository, now: () => now });
    const result = await service.addSessionExercise("user-1", workoutId, { exerciseId });

    assert.deepEqual(result, { ok: false, reason: "not_found" });
    assert.equal(repository.addedSessionExercise, null);
  });

  it("reorders a complete compact exercise list", async () => {
    const repository = new FakeWorkoutLoggingRepository();
    const service = createWorkoutLoggingService({ repository, now: () => now });
    const result = await service.reorderSessionExercises("user-1", workoutId, {
      items: [
        { sessionExerciseId: "session-exercise-2", position: 1 },
        { sessionExerciseId: "session-exercise-1", position: 2 }
      ]
    });

    assert.equal(result.ok, true);
    assert.deepEqual(repository.reordered, {
      workoutId,
      items: [
        { sessionExerciseId: "session-exercise-2", position: 1 },
        { sessionExerciseId: "session-exercise-1", position: 2 }
      ],
      updatedAt: now
    });
  });

  it("rejects incomplete or duplicate reorder requests", async () => {
    const repository = new FakeWorkoutLoggingRepository();
    const service = createWorkoutLoggingService({ repository, now: () => now });
    const result = await service.reorderSessionExercises("user-1", workoutId, {
      items: [
        { sessionExerciseId: "session-exercise-1", position: 1 },
        { sessionExerciseId: "session-exercise-1", position: 2 }
      ]
    });

    assert.deepEqual(result, { ok: false, reason: "invalid_order" });
    assert.equal(repository.reordered, null);
  });

  it("soft-deletes a session exercise after an ownership check", async () => {
    const repository = new FakeWorkoutLoggingRepository();
    const service = createWorkoutLoggingService({ repository, now: () => now });
    const result = await service.deleteSessionExercise("user-1", workoutId, sessionExerciseId);

    assert.deepEqual(result, { ok: true, value: { deleted: true } });
    assert.deepEqual(repository.sessionExerciseExistsCall, {
      userId: "user-1",
      workoutId,
      sessionExerciseId
    });
    assert.deepEqual(repository.deletedSessionExercise, {
      workoutId,
      sessionExerciseId,
      deletedAt: now
    });
  });

  it("maps failed session exercise deletion to not found", async () => {
    const repository = new FakeWorkoutLoggingRepository();
    repository.deleteSessionExerciseResult = false;
    const service = createWorkoutLoggingService({ repository, now: () => now });
    const result = await service.deleteSessionExercise("user-1", workoutId, sessionExerciseId);

    assert.deepEqual(result, { ok: false, reason: "not_found" });
  });

  it("adds a set at the next set order", async () => {
    const repository = new FakeWorkoutLoggingRepository();
    repository.setCount = 2;
    const service = createWorkoutLoggingService({ repository, now: () => now });
    const result = await service.addSet("user-1", workoutId, sessionExerciseId, setInput());

    assert.equal(result.ok, true);
    assert.deepEqual(repository.sessionExerciseExistsCall, {
      userId: "user-1",
      workoutId,
      sessionExerciseId
    });
    assert.equal(repository.addedSet?.setOrder, 3);

    if (result.ok) {
      assert.equal(result.value.setOrder, 3);
      assert.equal(result.value.weightKg, "80.50");
    }
  });

  it("updates a set partially while preserving set order", async () => {
    const repository = new FakeWorkoutLoggingRepository();
    repository.visibleSet = setRecord({ setOrder: 2 });
    const service = createWorkoutLoggingService({ repository, now: () => now });
    const result = await service.updateSet("user-1", setId, { reps: 9 });

    assert.equal(result.ok, true);
    assert.deepEqual(repository.setExistsCall, { userId: "user-1", setId });
    assert.deepEqual(repository.updatedSet, {
      setId,
      input: { reps: 9 },
      updatedAt: now
    });

    if (result.ok) {
      assert.equal(result.value.setOrder, 2);
      assert.equal(result.value.reps, 9);
    }
  });

  it("returns not found for invisible sets", async () => {
    const repository = new FakeWorkoutLoggingRepository();
    repository.visibleSet = null;
    const service = createWorkoutLoggingService({ repository, now: () => now });
    const result = await service.updateSet("user-1", setId, { reps: 9 });

    assert.deepEqual(result, { ok: false, reason: "not_found" });
    assert.equal(repository.updatedSet, null);
  });

  it("soft-deletes sets and maps delete races to not found", async () => {
    const repository = new FakeWorkoutLoggingRepository();
    repository.deleteSetResult = false;
    const service = createWorkoutLoggingService({ repository, now: () => now });
    const result = await service.deleteSet("user-1", setId);

    assert.deepEqual(result, { ok: false, reason: "not_found" });
    assert.deepEqual(repository.deletedSet, { setId, deletedAt: now });
  });
});

function exerciseRecord(): SelectableExerciseRecord {
  return {
    id: exerciseId,
    name: "Bench Press",
    primaryMuscleGroup: {
      id: "muscle-1",
      slug: "chest",
      name: "Chest"
    }
  };
}

function sessionExerciseRecord(
  overrides: Partial<SessionExerciseRecord> = {}
): SessionExerciseRecord {
  return {
    id: sessionExerciseId,
    position: 1,
    exercise: exerciseRecord(),
    ...overrides
  };
}

function setRecord(overrides: Partial<SetRecord> = {}): SetRecord {
  return {
    id: setId,
    sessionExerciseId,
    setOrder: 1,
    setType: "working",
    weightKg: "80.00",
    reps: 8,
    rir: 2,
    restTimeSeconds: 120,
    note: null,
    createdAt,
    updatedAt: createdAt,
    ...overrides
  };
}

function setInput(): AddSetRequest {
  return {
    setType: "working",
    weightKg: "80.50",
    reps: 8,
    rir: 2,
    restTimeSeconds: 120,
    note: null
  };
}
