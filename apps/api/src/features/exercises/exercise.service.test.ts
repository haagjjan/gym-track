import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  CreateExerciseResult,
  ExistingExerciseRecord,
  ExerciseListFilters,
  ExerciseListResult,
  ExerciseRecord,
  ExerciseRepository,
  MergeExerciseHistoryResult,
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
  public mergeCall: {
    userId: string;
    sourceExerciseId: string;
    targetExerciseId: string;
    mergedAt: Date;
  } | null = null;
  public activeExercisesById = new Map<string, ExerciseRecord>();
  public mergeResult: MergeExerciseHistoryResult = {
    reassignedSessionExercises: 3,
    reassignedTemplateExercises: 2,
    affectedWorkouts: 2,
    affectedTemplates: 1,
    affectedSets: 9,
    sourceRetired: true
  };

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

  public async listMuscleGroups(): Promise<MuscleGroupRecord[]> {
    return this.muscleGroups;
  }

  public async findExerciseByName(): Promise<ExistingExerciseRecord | null> {
    return this.existingExercise;
  }

  public async findActiveExerciseById(exerciseId: string): Promise<ExerciseRecord | null> {
    return this.activeExercisesById.get(exerciseId) ?? null;
  }

  public async mergeExerciseHistory(
    userId: string,
    sourceExerciseId: string,
    targetExerciseId: string,
    mergedAt: Date
  ): Promise<MergeExerciseHistoryResult> {
    this.mergeCall = { userId, sourceExerciseId, targetExerciseId, mergedAt };

    return this.mergeResult;
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

  public async updateExercise(input: RestoreExerciseInput): Promise<ExerciseRecord> {
    return this.restoreExercise(input);
  }
}

describe("exercise service", () => {
  it("lists exercises through filters and pagination", async () => {
    const repository = new FakeExerciseRepository();
    const service = createExerciseService({ repository, now: () => now });
    const result = await service.listExercises("user-1", {
      search: "bench",
      ownership: "editable",
      primaryMuscleGroupId: chest.id,
      limit: 10,
      offset: 20
    });

    assert.deepEqual(repository.listFilters, {
      search: "bench",
      searchAliases: ["Barbell Bench Press", "Flat Bench Press"],
      muscleGroupIds: [],
      primaryMuscleGroupId: chest.id,
      equipment: undefined,
      exerciseType: undefined,
      ownership: "editable",
      userId: "user-1",
      sort: "name",
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

  it("lists muscle groups in API shape", async () => {
    const service = createExerciseService({
      repository: new FakeExerciseRepository(),
      now: () => now
    });
    const result = await service.listMuscleGroups();

    assert.deepEqual(result, {
      items: [
        {
          id: chest.id,
          slug: "chest",
          name: "Chest"
        },
        {
          id: triceps.id,
          slug: "triceps",
          name: "Triceps"
        }
      ]
    });
  });

  it("creates a user-scoped exercise with secondary muscles", async () => {
    const repository = new FakeExerciseRepository();
    const service = createExerciseService({ repository, now: () => now });
    const result = await service.createExercise("user-1", createInput());

    assert.equal(result.ok, true);
    assert.equal(repository.createdExercise?.createdByUserId, "user-1");
    assert.equal(repository.createdExercise?.name, "Dumbbell Bench Press");
    assert.deepEqual(repository.createdExercise?.secondaryMuscleGroupIds, [triceps.id]);
  });

  it("requires review for plausible names outside the catalog", async () => {
    const repository = new FakeExerciseRepository();
    const service = createExerciseService({ repository, now: () => now });
    const result = await service.createExercise("user-1", {
      ...createInput(),
      name: "Jan Curl Variation"
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, "name_review_required");
    assert.equal(repository.createdExercise, null);
  });

  it("creates a warned exercise after explicit confirmation", async () => {
    const repository = new FakeExerciseRepository();
    const service = createExerciseService({ repository, now: () => now });
    const result = await service.createExercise("user-1", {
      ...createInput(),
      name: "Jan Curl Variation",
      confirmNameWarning: true
    });

    assert.equal(result.ok, true);
    assert.equal(repository.createdExercise?.name, "Jan Curl Variation");
  });

  it("blocks suspicious names before persistence", async () => {
    const repository = new FakeExerciseRepository();
    const service = createExerciseService({ repository, now: () => now });
    const result = await service.createExercise("user-1", {
      ...createInput(),
      name: "Bench Press 2026-05-20"
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, "name_blocked");
    assert.equal(repository.createdExercise, null);
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

  it("rejects merging an exercise into itself", async () => {
    const repository = new FakeExerciseRepository();
    const service = createExerciseService({ repository, now: () => now });
    const result = await service.mergeExercises("user-1", "exercise-1", {
      targetExerciseId: "exercise-1"
    });

    assert.deepEqual(result, { ok: false, reason: "merge_same_exercise" });
    assert.equal(repository.mergeCall, null);
  });

  it("rejects a merge when either exercise is missing or deleted", async () => {
    const repository = new FakeExerciseRepository();

    repository.activeExercisesById.set("exercise-1", exerciseRecord());

    const service = createExerciseService({ repository, now: () => now });
    const result = await service.mergeExercises("user-1", "exercise-1", {
      targetExerciseId: "exercise-2"
    });

    assert.deepEqual(result, { ok: false, reason: "exercise_not_found" });
    assert.equal(repository.mergeCall, null);
  });

  it("merges an exercise into another and reports the affected history", async () => {
    const repository = new FakeExerciseRepository();

    repository.activeExercisesById.set(
      "exercise-1",
      exerciseRecord({ id: "exercise-1", name: "Bench Pres" })
    );
    repository.activeExercisesById.set(
      "exercise-2",
      exerciseRecord({ id: "exercise-2", name: "Bench Press" })
    );

    const service = createExerciseService({ repository, now: () => now });
    const result = await service.mergeExercises("user-1", "exercise-1", {
      targetExerciseId: "exercise-2"
    });

    assert.equal(result.ok, true);
    assert.deepEqual(repository.mergeCall, {
      userId: "user-1",
      sourceExerciseId: "exercise-1",
      targetExerciseId: "exercise-2",
      mergedAt: now
    });

    if (result.ok) {
      assert.deepEqual(result.value, {
        source: { id: "exercise-1", name: "Bench Pres", retired: true },
        target: { id: "exercise-2", name: "Bench Press" },
        reassignedSessionExercises: 3,
        reassignedTemplateExercises: 2,
        affectedWorkouts: 2,
        affectedTemplates: 1,
        affectedSets: 9
      });
    }
  });
});

function createInput() {
  return {
    name: "Dumbbell Bench Press",
    equipment: "dumbbell",
    exerciseType: "compound",
    primaryMuscleGroupIds: [chest.id],
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
    primaryMuscleGroups: [chest],
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
