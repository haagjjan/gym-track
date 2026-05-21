import { sql, type Kysely } from "kysely";
import type { AppDatabase } from "../../db/database.js";

export interface MuscleGroupRecord {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
}

export interface ExerciseRecord {
  id: string;
  name: string;
  equipment: string | null;
  exerciseType: string | null;
  primaryMuscleGroup: MuscleGroupRecord;
  secondaryMuscleGroups: MuscleGroupRecord[];
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExistingExerciseRecord {
  id: string;
  deletedAt: Date | null;
}

export interface ExerciseListFilters {
  search: string | undefined;
  primaryMuscleGroupId: string | undefined;
  limit: number;
  offset: number;
}

export interface NewExercise {
  id: string;
  name: string;
  equipment: string | null;
  exerciseType: string | null;
  primaryMuscleGroupId: string;
  secondaryMuscleGroupIds: string[];
  createdByUserId: string;
}

export interface RestoreExerciseInput {
  id: string;
  name: string;
  equipment: string | null;
  exerciseType: string | null;
  primaryMuscleGroupId: string;
  secondaryMuscleGroupIds: string[];
  updatedAt: Date;
}

export interface ExerciseListResult {
  items: ExerciseRecord[];
  total: number;
}

export type CreateExerciseResult =
  | { status: "created"; exercise: ExerciseRecord }
  | { status: "conflict" };

export interface ExerciseRepository {
  listExercises(filters: ExerciseListFilters): Promise<ExerciseListResult>;
  findExerciseByName(name: string): Promise<ExistingExerciseRecord | null>;
  findMuscleGroupsByIds(ids: string[]): Promise<MuscleGroupRecord[]>;
  createExercise(input: NewExercise): Promise<CreateExerciseResult>;
  restoreExercise(input: RestoreExerciseInput): Promise<ExerciseRecord>;
}

export function createExerciseRepository(db: Kysely<AppDatabase>): ExerciseRepository {
  return {
    async listExercises(filters) {
      const rows = await listExerciseRows(db, filters);
      const total = await countExerciseRows(db, filters);
      const secondaryMuscles = await findSecondaryMuscleGroups(
        db,
        rows.map((row) => row.id)
      );

      return {
        items: rows.map((row) => toExerciseRecord(row, secondaryMuscles.get(row.id) ?? [])),
        total
      };
    },
    async findExerciseByName(name) {
      const row = await db
        .selectFrom("exercises")
        .select(["id", "deleted_at as deletedAt"])
        .where(sql<string>`lower(name)`, "=", name.toLowerCase())
        .executeTakeFirst();

      return row ?? null;
    },
    async findMuscleGroupsByIds(ids) {
      if (ids.length === 0) {
        return [];
      }

      const rows = await db
        .selectFrom("muscle_groups")
        .select(muscleGroupSelection)
        .where("id", "in", ids)
        .execute();

      return rows.map(toMuscleGroupRecord);
    },
    async createExercise(input) {
      try {
        const exerciseId = await db.transaction().execute(async (trx) => {
          const inserted = await trx
            .insertInto("exercises")
            .values({
              id: input.id,
              name: input.name,
              equipment: input.equipment,
              exercise_type: input.exerciseType,
              primary_muscle_group_id: input.primaryMuscleGroupId,
              created_by_user_id: input.createdByUserId
            })
            .returning("id")
            .executeTakeFirstOrThrow();

          await replaceSecondaryMuscles(trx, inserted.id, input.secondaryMuscleGroupIds);

          return inserted.id;
        });

        return {
          status: "created",
          exercise: await findExerciseByIdOrThrow(db, exerciseId)
        };
      } catch (error) {
        if (isUniqueViolation(error)) {
          return { status: "conflict" };
        }

        throw error;
      }
    },
    async restoreExercise(input) {
      await db.transaction().execute(async (trx) => {
        await trx
          .updateTable("exercises")
          .set({
            name: input.name,
            equipment: input.equipment,
            exercise_type: input.exerciseType,
            primary_muscle_group_id: input.primaryMuscleGroupId,
            updated_at: input.updatedAt,
            deleted_at: null
          })
          .where("id", "=", input.id)
          .executeTakeFirstOrThrow();

        await replaceSecondaryMuscles(trx, input.id, input.secondaryMuscleGroupIds);
      });

      return findExerciseByIdOrThrow(db, input.id);
    }
  };
}

const exerciseSelection = [
  "exercises.id as id",
  "exercises.name as name",
  "exercises.equipment as equipment",
  "exercises.exercise_type as exerciseType",
  "exercises.created_by_user_id as createdByUserId",
  "exercises.created_at as createdAt",
  "exercises.updated_at as updatedAt",
  "muscle_groups.id as primaryMuscleGroupId",
  "muscle_groups.slug as primaryMuscleGroupSlug",
  "muscle_groups.name as primaryMuscleGroupName",
  "muscle_groups.sort_order as primaryMuscleGroupSortOrder"
] as const;

const muscleGroupSelection = [
  "id",
  "slug",
  "name",
  "sort_order as sortOrder"
] as const;

async function listExerciseRows(
  db: Kysely<AppDatabase>,
  filters: ExerciseListFilters
): Promise<ExerciseRow[]> {
  return db
    .selectFrom("exercises")
    .innerJoin("muscle_groups", "muscle_groups.id", "exercises.primary_muscle_group_id")
    .select(exerciseSelection)
    .where("exercises.deleted_at", "is", null)
    .$if(filters.primaryMuscleGroupId !== undefined, (query) =>
      query.where("exercises.primary_muscle_group_id", "=", filters.primaryMuscleGroupId as string)
    )
    .$if(filters.search !== undefined, (query) =>
      query.where(sql<string>`lower(exercises.name)`, "like", `%${filters.search?.toLowerCase()}%`)
    )
    .orderBy("exercises.name", "asc")
    .limit(filters.limit)
    .offset(filters.offset)
    .execute();
}

async function countExerciseRows(
  db: Kysely<AppDatabase>,
  filters: ExerciseListFilters
): Promise<number> {
  const row = await db
    .selectFrom("exercises")
    .select((eb) => eb.fn.countAll<string>().as("total"))
    .where("deleted_at", "is", null)
    .$if(filters.primaryMuscleGroupId !== undefined, (query) =>
      query.where("primary_muscle_group_id", "=", filters.primaryMuscleGroupId as string)
    )
    .$if(filters.search !== undefined, (query) =>
      query.where(sql<string>`lower(name)`, "like", `%${filters.search?.toLowerCase()}%`)
    )
    .executeTakeFirstOrThrow();

  return Number(row.total);
}

async function findExerciseByIdOrThrow(
  db: Kysely<AppDatabase>,
  exerciseId: string
): Promise<ExerciseRecord> {
  const row = await db
    .selectFrom("exercises")
    .innerJoin("muscle_groups", "muscle_groups.id", "exercises.primary_muscle_group_id")
    .select(exerciseSelection)
    .where("exercises.id", "=", exerciseId)
    .executeTakeFirstOrThrow();
  const secondaryMuscles = await findSecondaryMuscleGroups(db, [exerciseId]);

  return toExerciseRecord(row, secondaryMuscles.get(exerciseId) ?? []);
}

async function findSecondaryMuscleGroups(
  db: Kysely<AppDatabase>,
  exerciseIds: string[]
): Promise<Map<string, MuscleGroupRecord[]>> {
  const grouped = new Map<string, MuscleGroupRecord[]>();

  if (exerciseIds.length === 0) {
    return grouped;
  }

  const rows = await db
    .selectFrom("exercise_secondary_muscles")
    .innerJoin("muscle_groups", "muscle_groups.id", "exercise_secondary_muscles.muscle_group_id")
    .select([
      "exercise_secondary_muscles.exercise_id as exerciseId",
      "muscle_groups.id as id",
      "muscle_groups.slug as slug",
      "muscle_groups.name as name",
      "muscle_groups.sort_order as sortOrder"
    ])
    .where("exercise_secondary_muscles.exercise_id", "in", exerciseIds)
    .orderBy("muscle_groups.sort_order", "asc")
    .execute();

  for (const row of rows) {
    grouped.set(row.exerciseId, [
      ...(grouped.get(row.exerciseId) ?? []),
      {
        id: row.id,
        slug: row.slug,
        name: row.name,
        sortOrder: row.sortOrder
      }
    ]);
  }

  return grouped;
}

async function replaceSecondaryMuscles(
  db: Kysely<AppDatabase>,
  exerciseId: string,
  muscleGroupIds: string[]
): Promise<void> {
  await db
    .deleteFrom("exercise_secondary_muscles")
    .where("exercise_id", "=", exerciseId)
    .execute();

  if (muscleGroupIds.length === 0) {
    return;
  }

  await db
    .insertInto("exercise_secondary_muscles")
    .values(muscleGroupIds.map((muscleGroupId) => ({ exercise_id: exerciseId, muscle_group_id: muscleGroupId })))
    .execute();
}

type ExerciseRow = {
  id: string;
  name: string;
  equipment: string | null;
  exerciseType: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  primaryMuscleGroupId: string;
  primaryMuscleGroupSlug: string;
  primaryMuscleGroupName: string;
  primaryMuscleGroupSortOrder: number;
};

function toExerciseRecord(row: ExerciseRow, secondaryMuscleGroups: MuscleGroupRecord[]): ExerciseRecord {
  return {
    id: row.id,
    name: row.name,
    equipment: row.equipment,
    exerciseType: row.exerciseType,
    primaryMuscleGroup: {
      id: row.primaryMuscleGroupId,
      slug: row.primaryMuscleGroupSlug,
      name: row.primaryMuscleGroupName,
      sortOrder: row.primaryMuscleGroupSortOrder
    },
    secondaryMuscleGroups,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function toMuscleGroupRecord(row: {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
}): MuscleGroupRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    sortOrder: row.sortOrder
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}
