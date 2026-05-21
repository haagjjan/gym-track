import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  CreateExerciseResult,
  ExistingExerciseRecord,
  ExerciseListFilters,
  ExerciseListResult,
  ExerciseRecord,
  ExerciseRepository,
  MuscleGroupRecord,
  NewExercise,
  RestoreExerciseInput
} from "./exercise.repository.js";
import { createExerciseService } from "./exercise.service.js";

const now = new Date("2026-05-20T12:00:00.000Z");
const createdAt = new Date("2026-05-20T10:00:00.000Z");
const chest = muscleGroupRecord("muscle-1", "chest", "Chest", 1);
const triceps = muscleGroupRecord("muscle-2", "triceps", "Triceps", 5);

class FakeExerciseRepository implements ExerciseRepository {
  public listFilters: ExerciseListFilters | null = null;
  public createdExercise: NewExercise | null = null;
  public restoredExercise: RestoreExerciseInput | null = null;

  public constructor(
    private readonly existingExercise: ExistingExerciseRecord | null = null,
    private readonly muscleGroups: MuscleGroupRecord[] = [chest, triceps]
  ) {}

  public async listExercises(filters: ExerciseListFilters): Promise<ExerciseListResult> {
    this.listFilters = filters;

    return {
      items: [exerciseRecord()],
      total: 1
    };
  }

  public async findExerciseByName(): Promise<ExistingExerciseRecord | null> {
    return this.existingExercise;
  }

  public async findMuscleGroupsByIds(ids: string[]): Promise<MuscleGroupRecord[]> {
    return this.muscleGroups.filter((muscleGroup) => ids.includes(muscleGroup.id));
  }

  public async createExercise(input: NewExercise): Promise<CreateExerciseResult> {
    this.createdExercise = input;

    return {
      status: "created",
      exercise: exerciseRecord({
        id: input.id,
        name: input.name,
        equipment: input.equipment,
        exerciseType: input.exerciseType,
        createdByUserId: input.createdByUserId,
        secondaryMuscleGroups: input.secondaryMuscleGroupIds.map((id) =>
          id === triceps.id ? triceps : chest
        )
      })
    };
  }

  public async restoreExercise(input: RestoreExerciseInput): Promise<ExerciseRecord> {
    this.restoredExercise = input;

    return exerciseRecord({
      id: input.id,
      name: input.name,
      equipment: input.equipment,
      exerciseType: input.exerciseType,
      createdByUserId: null,
      updatedAt: input.updatedAt,
      secondaryMuscleGroups: input.secondaryMuscleGroupIds.map((id) =>
        id === triceps.id ? triceps : chest
      )
    });
  }
}

describe("exercise service", () => {
  it("lists exercises through filters and pagination", async () => {
    const repository = new FakeExerciseRepository();
    const service = createExerciseService({ repository, now: () => now });
    const result = await service.listExercises({
      search: "bench",
      primaryMuscleGroupId: chest.id,
      limit: 10,
      offset: 20
    });

    assert.deepEqual(repository.listFilters, {
      search: "bench",
      primaryMuscleGroupId: chest.id,
      limit: 10,
      offset: 20
    });
    assert.deepEqual(result.pagination, {
      limit: 10,
      offset: 20,
      total: 1
    });
    assert.equal(result.items[0]?.primaryMuscleGroup.name, "Chest");
  });

  it("creates a user-scoped exercise with secondary muscles", async () => {
    const repository = new FakeExerciseRepository();
    const service = createExerciseService({ repository, now: () => now });
    const result = await service.createExercise("user-1", {
      name: "Incline Dumbbell Press",
      equipment: "dumbbell",
      exerciseType: "compound",
      primaryMuscleGroupId: chest.id,
      secondaryMuscleGroupIds: [triceps.id]
    });

    assert.equal(result.ok, true);
    assert.equal(repository.createdExercise?.createdByUserId, "user-1");
    assert.equal(repository.createdExercise?.name, "Incline Dumbbell Press");
    assert.deepEqual(repository.createdExercise?.secondaryMuscleGroupIds, [triceps.id]);
  });

  it("rejects active exercise name conflicts", async () => {
    const service = createExerciseService({
      repository: new FakeExerciseRepository({ id: "exercise-1", deletedAt: null }),
      now: () => now
    });

    const result = await service.createExercise("user-1", createInput());

    assert.deepEqual(result, { ok: false, reason: "name_conflict" });
  });

  it("restores a soft-deleted exercise instead of creating a duplicate", async () => {
    const repository = new FakeExerciseRepository({
      id: "exercise-1",
      deletedAt: new Date("2026-05-19T12:00:00.000Z")
    });
    const service = createExerciseService({ repository, now: () => now });
    const result = await service.createExercise("user-1", createInput());

    assert.equal(result.ok, true);
    assert.equal(repository.createdExercise, null);
    assert.equal(repository.restoredExercise?.id, "exercise-1");
    assert.equal(repository.restoredExercise?.updatedAt, now);
  });

  it("rejects unknown primary or secondary muscle groups", async () => {
    const repository = new FakeExerciseRepository(null, [chest]);
    const service = createExerciseService({ repository, now: () => now });
    const result = await service.createExercise("user-1", createInput());

    assert.deepEqual(result, { ok: false, reason: "muscle_group_not_found" });
    assert.equal(repository.createdExercise, null);
    assert.equal(repository.restoredExercise, null);
  });
});

function createInput() {
  return {
    name: "Incline Dumbbell Press",
    equipment: "dumbbell",
    exerciseType: "compound",
    primaryMuscleGroupId: chest.id,
    secondaryMuscleGroupIds: [triceps.id]
  };
}

function exerciseRecord(overrides: Partial<ExerciseRecord> = {}): ExerciseRecord {
  return {
    id: "exercise-1",
    name: "Bench Press",
    equipment: "barbell",
    exerciseType: "compound",
    primaryMuscleGroup: chest,
    secondaryMuscleGroups: [],
    createdByUserId: null,
    createdAt,
    updatedAt: createdAt,
    ...overrides
  };
}

function muscleGroupRecord(
  id: string,
  slug: string,
  name: string,
  sortOrder: number
): MuscleGroupRecord {
  return {
    id,
    slug,
    name,
    sortOrder
  };
}
