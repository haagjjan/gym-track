import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  CreateWorkoutResult,
  NewWorkoutSession,
  WorkoutDetailRecord,
  WorkoutListFilters,
  WorkoutListResult,
  WorkoutRepository,
  WorkoutSessionPatch,
  WorkoutSessionRecord
} from "./workout.repository.js";
import { createWorkoutService } from "./workout.service.js";

const now = new Date("2026-05-20T12:00:00.000Z");
const startedAt = new Date("2026-05-20T10:00:00.000Z");
const endedAt = new Date("2026-05-20T11:00:00.000Z");

class FakeWorkoutRepository implements WorkoutRepository {
  public createdWorkout: NewWorkoutSession | null = null;
  public listFilters: WorkoutListFilters | null = null;
  public endedWorkout:
    | {
        userId: string;
        workoutId: string;
        endedAt: Date;
        updatedAt: Date;
      }
    | null = null;
  public updatedWorkout:
    | {
        userId: string;
        workoutId: string;
        patch: WorkoutSessionPatch;
        updatedAt: Date;
      }
    | null = null;
  public deletedWorkout: { userId: string; workoutId: string; deletedAt: Date } | null = null;

  public constructor(
    private readonly createResult: CreateWorkoutResult = {
      status: "created",
      workout: sessionRecord()
    },
    private readonly workout: WorkoutDetailRecord | null = detailRecord()
  ) {}

  public async createWorkout(workout: NewWorkoutSession): Promise<CreateWorkoutResult> {
    this.createdWorkout = workout;

    if (this.createResult.status === "conflict") {
      return this.createResult;
    }

    return {
      status: "created",
      workout: {
        ...sessionRecord(),
        id: workout.id,
        userId: workout.userId,
        startedAt: workout.startedAt,
        workoutType: workout.workoutType,
        title: workout.title,
        notes: workout.notes
      }
    };
  }

  public async listWorkouts(filters: WorkoutListFilters): Promise<WorkoutListResult> {
    this.listFilters = filters;

    return {
      items: [
        {
          ...sessionRecord({ endedAt }),
          totalExercises: 2,
          totalSets: 6,
          tonnageKg: "1200",
          exercisePreview: []
        }
      ],
      total: 1,
      allTimeSummary: {
        totalSessions: 1,
        completedSessions: 1,
        cumulativeTonnageKg: "1200",
        averageCompletedDurationSeconds: 3600,
        completionRate: 1
      }
    };
  }

  public async findWorkoutSession(): Promise<WorkoutSessionRecord | null> {
    return this.workout ? this.workout : null;
  }

  public async findWorkoutDetail(): Promise<WorkoutDetailRecord | null> {
    return this.workout;
  }

  public async endWorkout(
    userId: string,
    workoutId: string,
    workoutEndedAt: Date,
    updatedAt: Date
  ): Promise<WorkoutDetailRecord | null> {
    this.endedWorkout = {
      userId,
      workoutId,
      endedAt: workoutEndedAt,
      updatedAt
    };

    return this.workout ? { ...this.workout, endedAt: workoutEndedAt } : null;
  }

  public async updateWorkout(
    userId: string,
    workoutId: string,
    patch: WorkoutSessionPatch,
    updatedAt: Date
  ): Promise<WorkoutDetailRecord | null> {
    this.updatedWorkout = { userId, workoutId, patch, updatedAt };

    if (!this.workout) {
      return null;
    }

    return {
      ...this.workout,
      startedAt: patch.startedAt ?? this.workout.startedAt,
      endedAt: patch.endedAt !== undefined ? patch.endedAt : this.workout.endedAt,
      title: patch.title !== undefined ? patch.title : this.workout.title
    };
  }

  public async deleteWorkout(
    userId: string,
    workoutId: string,
    deletedAt: Date
  ): Promise<WorkoutSessionRecord | null> {
    this.deletedWorkout = { userId, workoutId, deletedAt };

    return this.workout;
  }
}

describe("workout service", () => {
  it("creates a workout with a default start time", async () => {
    const repository = new FakeWorkoutRepository();
    const service = createWorkoutService({ repository, now: () => now });
    const result = await service.createWorkout("user-1", {});

    assert.equal(result.ok, true);
    assert.equal(repository.createdWorkout?.userId, "user-1");
    assert.equal(repository.createdWorkout?.startedAt, now);

    if (result.ok) {
      assert.equal(result.value.startedAt, now.toISOString());
      assert.equal(result.value.isOpen, true);
      assert.deepEqual(result.value.exercises, []);
    }
  });

  it("maps a create conflict to an open workout result", async () => {
    const service = createWorkoutService({
      repository: new FakeWorkoutRepository({ status: "conflict" }),
      now: () => now
    });

    const result = await service.createWorkout("user-1", {});

    assert.deepEqual(result, { ok: false, reason: "open_workout_exists" });
  });

  it("lists workouts through user-scoped filters", async () => {
    const repository = new FakeWorkoutRepository();
    const service = createWorkoutService({ repository, now: () => now });
    const result = await service.listWorkouts("user-1", {
      startDate: startedAt,
      endDate: endedAt,
      limit: 10,
      offset: 20
    });

    assert.equal(repository.listFilters?.userId, "user-1");
    assert.equal(repository.listFilters?.startDate, startedAt);
    assert.equal(repository.listFilters?.endDate, endedAt);
    assert.deepEqual(result.pagination, {
      limit: 10,
      offset: 20,
      total: 1
    });
    assert.equal(result.items[0]?.totalSets, 6);
  });

  it("returns not found when a workout is not visible to the user", async () => {
    const service = createWorkoutService({
      repository: new FakeWorkoutRepository(undefined, null),
      now: () => now
    });

    const result = await service.getWorkout("user-1", "workout-1");

    assert.deepEqual(result, { ok: false, reason: "not_found" });
  });

  it("rejects an end time before the workout start", async () => {
    const repository = new FakeWorkoutRepository(undefined, detailRecord({ startedAt }));
    const service = createWorkoutService({ repository, now: () => now });
    const result = await service.endWorkout("user-1", "workout-1", {
      endedAt: new Date("2026-05-20T09:59:59.000Z")
    });

    assert.deepEqual(result, { ok: false, reason: "ended_before_started" });
    assert.equal(repository.endedWorkout, null);
  });

  it("ends an open workout with the current time by default", async () => {
    const repository = new FakeWorkoutRepository(undefined, detailRecord({ startedAt }));
    const service = createWorkoutService({ repository, now: () => endedAt });
    const result = await service.endWorkout("user-1", "workout-1", {});

    assert.equal(result.ok, true);
    assert.equal(repository.endedWorkout?.userId, "user-1");
    assert.equal(repository.endedWorkout?.workoutId, "workout-1");
    assert.equal(repository.endedWorkout?.endedAt, endedAt);
    assert.equal(repository.endedWorkout?.updatedAt, endedAt);

    if (result.ok) {
      assert.equal(result.value.endedAt, endedAt.toISOString());
      assert.equal(result.value.isOpen, false);
    }
  });

  it("returns already closed when ending a closed workout", async () => {
    const service = createWorkoutService({
      repository: new FakeWorkoutRepository(undefined, detailRecord({ endedAt })),
      now: () => now
    });

    const result = await service.endWorkout("user-1", "workout-1", {});

    assert.deepEqual(result, { ok: false, reason: "already_closed" });
  });

  it("renames a workout without touching its times", async () => {
    const repository = new FakeWorkoutRepository(undefined, detailRecord({ endedAt }));
    const service = createWorkoutService({ repository, now: () => now });
    const result = await service.updateWorkout("user-1", "workout-1", { title: "Leg day" });

    assert.equal(result.ok, true);
    assert.deepEqual(repository.updatedWorkout?.patch, { title: "Leg day" });
    assert.equal(repository.updatedWorkout?.updatedAt, now);

    if (result.ok) {
      assert.equal(result.value.title, "Leg day");
    }
  });

  it("rejects editing the end time of an open workout", async () => {
    const repository = new FakeWorkoutRepository(undefined, detailRecord());
    const service = createWorkoutService({ repository, now: () => now });
    const result = await service.updateWorkout("user-1", "workout-1", {
      endedAt: new Date("2026-05-20T11:30:00.000Z")
    });

    assert.deepEqual(result, { ok: false, reason: "workout_still_open" });
    assert.equal(repository.updatedWorkout, null);
  });

  it("rejects a time edit that puts the end before the start", async () => {
    const repository = new FakeWorkoutRepository(undefined, detailRecord({ endedAt }));
    const service = createWorkoutService({ repository, now: () => now });
    const result = await service.updateWorkout("user-1", "workout-1", {
      startedAt: new Date("2026-05-20T11:30:00.000Z")
    });

    assert.deepEqual(result, { ok: false, reason: "ended_before_started" });
    assert.equal(repository.updatedWorkout, null);
  });

  it("updates both times of a closed workout together", async () => {
    const repository = new FakeWorkoutRepository(undefined, detailRecord({ endedAt }));
    const service = createWorkoutService({ repository, now: () => now });
    const newStartedAt = new Date("2026-05-20T09:00:00.000Z");
    const newEndedAt = new Date("2026-05-20T10:15:00.000Z");
    const result = await service.updateWorkout("user-1", "workout-1", {
      startedAt: newStartedAt,
      endedAt: newEndedAt
    });

    assert.equal(result.ok, true);
    assert.deepEqual(repository.updatedWorkout?.patch, {
      startedAt: newStartedAt,
      endedAt: newEndedAt
    });

    if (result.ok) {
      assert.equal(result.value.startedAt, newStartedAt.toISOString());
      assert.equal(result.value.endedAt, newEndedAt.toISOString());
    }
  });

  it("returns not found when updating a workout that is not visible", async () => {
    const service = createWorkoutService({
      repository: new FakeWorkoutRepository(undefined, null),
      now: () => now
    });

    const result = await service.updateWorkout("user-1", "workout-1", { title: "X" });

    assert.deepEqual(result, { ok: false, reason: "not_found" });
  });

  it("soft deletes an owned active workout", async () => {
    const repository = new FakeWorkoutRepository();
    const service = createWorkoutService({ repository, now: () => now });
    const result = await service.deleteWorkout("user-1", "workout-1");

    assert.deepEqual(repository.deletedWorkout, {
      userId: "user-1",
      workoutId: "workout-1",
      deletedAt: now
    });
    assert.deepEqual(result, {
      ok: true,
      value: { workoutId: "workout-1", wasOpen: true }
    });
  });

  it("does not reveal an unauthorized workout during deletion", async () => {
    const service = createWorkoutService({
      repository: new FakeWorkoutRepository(undefined, null),
      now: () => now
    });

    const result = await service.deleteWorkout("user-2", "workout-1");

    assert.deepEqual(result, { ok: false, reason: "not_found" });
  });
});

function sessionRecord(overrides: Partial<WorkoutSessionRecord> = {}): WorkoutSessionRecord {
  return {
    id: "workout-1",
    userId: "user-1",
    startedAt,
    endedAt: null,
    workoutType: "upper",
    title: "Upper A",
    notes: null,
    ...overrides
  };
}

function detailRecord(overrides: Partial<WorkoutSessionRecord> = {}): WorkoutDetailRecord {
  return {
    ...sessionRecord(overrides),
    exercises: []
  };
}
