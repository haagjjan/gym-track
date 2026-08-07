import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  MutationWriteResult,
  SessionExerciseRecord,
  SetRecord,
  WorkoutLoggingRepository
} from "./workout-logging.repository.js";
import type {
  AddSessionExerciseRequest,
  AddSetRequest,
  ReorderSessionExercisesRequest,
  UpdateSetRequest
} from "./workout-logging.schemas.js";
import { createWorkoutLoggingService } from "./workout-logging.service.js";

const now = new Date("2026-05-20T12:00:00.000Z");
const workoutId = "workout-1";
const sessionExerciseId = "session-exercise-1";
const setId = "set-1";
const clientMutationId = "66666666-6666-4666-8666-666666666666";

class FakeWorkoutLoggingRepository implements WorkoutLoggingRepository {
  public addExerciseCall: Parameters<WorkoutLoggingRepository["addSessionExercise"]>[0] | null = null;
  public reorderCall: unknown[] | null = null;
  public deleteExerciseCall: unknown[] | null = null;
  public addSetCall: Parameters<WorkoutLoggingRepository["addSet"]>[0] | null = null;
  public updateSetCall: unknown[] | null = null;
  public deleteSetCall: unknown[] | null = null;

  public addExerciseResult: MutationWriteResult<SessionExerciseRecord> = success(
    sessionExerciseRecord()
  );
  public reorderResult: MutationWriteResult<
    { sessionExerciseId: string; position: number }[]
  > = success([{ sessionExerciseId, position: 1 }]);
  public deleteExerciseResult: MutationWriteResult<{ deleted: true }> = success({
    deleted: true
  });
  public addSetResult: MutationWriteResult<SetRecord> = success(setRecord());
  public updateSetResult: SetRecord | null = setRecord();
  public deleteSetResult: MutationWriteResult<{ deleted: true }> = success({ deleted: true });

  public async addSessionExercise(
    input: Parameters<WorkoutLoggingRepository["addSessionExercise"]>[0]
  ): Promise<MutationWriteResult<SessionExerciseRecord>> {
    this.addExerciseCall = input;
    return this.addExerciseResult;
  }

  public async reorderSessionExercises(
    userId: string,
    currentWorkoutId: string,
    input: ReorderSessionExercisesRequest,
    updatedAt: Date
  ): Promise<MutationWriteResult<{ sessionExerciseId: string; position: number }[]>> {
    this.reorderCall = [userId, currentWorkoutId, input, updatedAt];
    return this.reorderResult;
  }

  public async deleteSessionExercise(
    userId: string,
    currentWorkoutId: string,
    currentSessionExerciseId: string,
    deletedAt: Date
  ): Promise<MutationWriteResult<{ deleted: true }>> {
    this.deleteExerciseCall = [userId, currentWorkoutId, currentSessionExerciseId, deletedAt];
    return this.deleteExerciseResult;
  }

  public async addSet(
    input: Parameters<WorkoutLoggingRepository["addSet"]>[0]
  ): Promise<MutationWriteResult<SetRecord>> {
    this.addSetCall = input;
    return this.addSetResult;
  }

  public async updateSet(
    userId: string,
    currentSetId: string,
    input: UpdateSetRequest,
    updatedAt: Date
  ): Promise<SetRecord | null> {
    this.updateSetCall = [userId, currentSetId, input, updatedAt];
    return this.updateSetResult;
  }

  public async deleteSet(
    userId: string,
    currentSetId: string,
    deletedAt: Date
  ): Promise<MutationWriteResult<{ deleted: true }>> {
    this.deleteSetCall = [userId, currentSetId, deletedAt];
    return this.deleteSetResult;
  }
}

describe("workout logging service", () => {
  it("passes an idempotent exercise create to the atomic repository", async () => {
    const repository = new FakeWorkoutLoggingRepository();
    repository.addExerciseResult = success(sessionExerciseRecord(), true);
    const service = createWorkoutLoggingService({ repository, now: () => now });
    const input: AddSessionExerciseRequest = {
      clientMutationId,
      exerciseId: "exercise-1",
      position: 1
    };
    const result = await service.addSessionExercise("user-1", workoutId, input);

    assert.equal(result.ok && result.replayed, true);
    assert.equal(repository.addExerciseCall?.userId, "user-1");
    assert.equal(repository.addExerciseCall?.workoutId, workoutId);
    assert.deepEqual(repository.addExerciseCall?.values, input);
    assert.match(repository.addExerciseCall?.id ?? "", /^[0-9a-f-]{36}$/);
  });

  it("propagates stable repository failures", async () => {
    const repository = new FakeWorkoutLoggingRepository();
    repository.addExerciseResult = { ok: false, reason: "idempotency_conflict" };
    const service = createWorkoutLoggingService({ repository });
    const result = await service.addSessionExercise("user-1", workoutId, {
      clientMutationId,
      exerciseId: "exercise-1"
    });

    assert.deepEqual(result, { ok: false, reason: "idempotency_conflict" });
  });

  it("delegates reorder and exercise delete with ownership and time", async () => {
    const repository = new FakeWorkoutLoggingRepository();
    const service = createWorkoutLoggingService({ repository, now: () => now });
    const reorder = { items: [{ sessionExerciseId, position: 1 }] };

    await service.reorderSessionExercises("user-1", workoutId, reorder);
    await service.deleteSessionExercise("user-1", workoutId, sessionExerciseId);

    assert.deepEqual(repository.reorderCall, ["user-1", workoutId, reorder, now]);
    assert.deepEqual(repository.deleteExerciseCall, [
      "user-1",
      workoutId,
      sessionExerciseId,
      now
    ]);
  });

  it("passes an idempotent set create to the atomic repository", async () => {
    const repository = new FakeWorkoutLoggingRepository();
    const service = createWorkoutLoggingService({ repository, now: () => now });
    const input = setInput();
    const result = await service.addSet(
      "user-1",
      workoutId,
      sessionExerciseId,
      input
    );

    assert.equal(result.ok && result.value.setOrder, 1);
    assert.equal(repository.addSetCall?.userId, "user-1");
    assert.equal(repository.addSetCall?.workoutId, workoutId);
    assert.equal(repository.addSetCall?.sessionExerciseId, sessionExerciseId);
    assert.deepEqual(repository.addSetCall?.values, input);
  });

  it("maps a lost update race to not found", async () => {
    const repository = new FakeWorkoutLoggingRepository();
    repository.updateSetResult = null;
    const service = createWorkoutLoggingService({ repository, now: () => now });
    const result = await service.updateSet("user-1", setId, { reps: 9 });

    assert.deepEqual(result, { ok: false, reason: "not_found" });
    assert.deepEqual(repository.updateSetCall, ["user-1", setId, { reps: 9 }, now]);
  });

  it("delegates serialized set deletion", async () => {
    const repository = new FakeWorkoutLoggingRepository();
    const service = createWorkoutLoggingService({ repository, now: () => now });
    const result = await service.deleteSet("user-1", setId);

    assert.equal(result.ok, true);
    assert.deepEqual(repository.deleteSetCall, ["user-1", setId, now]);
  });
});

function success<T>(value: T, replayed = false): MutationWriteResult<T> {
  return { ok: true, replayed, value };
}

function sessionExerciseRecord(): SessionExerciseRecord {
  return {
    id: sessionExerciseId,
    position: 1,
    exercise: {
      id: "exercise-1",
      name: "Bench Press",
      primaryMuscleGroup: { id: "muscle-1", slug: "chest", name: "Chest" }
    }
  };
}

function setInput(): AddSetRequest {
  return {
    clientMutationId,
    setType: "working",
    weightKg: "80.50",
    reps: 8,
    rir: 2,
    restTimeSeconds: 120,
    note: null
  };
}

function setRecord(): SetRecord {
  return {
    id: setId,
    sessionExerciseId,
    setOrder: 1,
    setType: "working",
    weightKg: "80.50",
    reps: 8,
    rir: 2,
    restTimeSeconds: 120,
    note: null,
    createdAt: now,
    updatedAt: now
  };
}
