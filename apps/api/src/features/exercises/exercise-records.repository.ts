import { sql, type Kysely } from "kysely";
import type { AppDatabase } from "../../db/database.js";
import type {
  ExerciseListFilters,
  ExerciseRecord,
  MuscleGroupRecord
} from "./exercise.repository.js";

export const exerciseSelection = [
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

export const muscleGroupSelection = [
  "id",
  "slug",
  "name",
  "sort_order as sortOrder"
] as const;

export async function listExerciseRows(
  db: Kysely<AppDatabase>,
  filters: ExerciseListFilters
): Promise<ExerciseRow[]> {
  let query = db
    .selectFrom("exercises")
    .innerJoin("muscle_groups", "muscle_groups.id", "exercises.primary_muscle_group_id")
    .select(exerciseSelection)
    .where("exercises.deleted_at", "is", null)
    .$if(filters.primaryMuscleGroupId !== undefined, (builder) =>
      builder.where(sql<boolean>`exists (
        select 1 from exercise_muscle_groups emg
        where emg.exercise_id = exercises.id
          and emg.muscle_group_id = ${filters.primaryMuscleGroupId as string}
          and emg.role = 'PRIMARY'
      )`)
    )
    .$if(filters.search !== undefined, (builder) =>
      builder.where(exerciseSearchPredicate(filters))
    )
    .$if(filters.search !== undefined, (builder) =>
      builder.orderBy(sql<number>`case
        when lower(exercises.name) = ${filters.search?.toLowerCase()} then 0
        when ${aliasNamePredicate(filters.searchAliases)} then 1
        when lower(exercises.name) like ${`${filters.search?.toLowerCase()}%`} then 2
        when lower(exercises.name) like ${`%${filters.search?.toLowerCase()}%`} then 3
        when similarity(lower(exercises.name), ${filters.search?.toLowerCase()}) >= ${searchSimilarityThreshold(filters.search ?? "")} then 4
        else 5 end`)
    )
    .$if(filters.search !== undefined, (builder) =>
      builder.orderBy(
        sql<number>`similarity(lower(exercises.name), ${filters.search?.toLowerCase()})`,
        "desc"
      )
    );

  for (const muscleGroupId of filters.muscleGroupIds) {
    query = query.where(sql<boolean>`exists (
      select 1 from exercise_muscle_groups emg
      where emg.exercise_id = exercises.id
        and emg.muscle_group_id = ${muscleGroupId}
    )`);
  }

  if (filters.equipment === "unspecified") {
    query = query.where("exercises.equipment", "is", null);
  } else if (filters.equipment) {
    query = query.where("exercises.equipment", "=", filters.equipment);
  }

  if (filters.exerciseType === "unspecified") {
    query = query.where("exercises.exercise_type", "is", null);
  } else if (filters.exerciseType) {
    query = query.where("exercises.exercise_type", "=", filters.exerciseType);
  }

  if (filters.ownership === "editable") {
    query = query.where("exercises.created_by_user_id", "=", filters.userId!);
  } else if (filters.ownership === "readOnly") {
    query = query.where(sql<boolean>`(
      exercises.created_by_user_id is null
      or exercises.created_by_user_id <> ${filters.userId}
    )`);
  }

  if (filters.sort === "muscle") {
    query = query.orderBy("muscle_groups.sort_order", "asc");
  } else if (filters.sort === "equipment") {
    query = query.orderBy(sql<string>`coalesce(exercises.equipment, 'zzzz')`, "asc");
  } else if (filters.sort === "type") {
    query = query.orderBy(sql<string>`coalesce(exercises.exercise_type, 'zzzz')`, "asc");
  }

  return query
    .orderBy("exercises.name", "asc")
    .limit(filters.limit)
    .offset(filters.offset)
    .execute();
}

export async function countExerciseRows(
  db: Kysely<AppDatabase>,
  filters: ExerciseListFilters
): Promise<number> {
  let query = db
    .selectFrom("exercises")
    .select((eb) => eb.fn.countAll<string>().as("total"))
    .where("deleted_at", "is", null)
    .$if(filters.primaryMuscleGroupId !== undefined, (builder) =>
      builder.where(sql<boolean>`exists (
        select 1 from exercise_muscle_groups emg
        where emg.exercise_id = exercises.id
          and emg.muscle_group_id = ${filters.primaryMuscleGroupId as string}
          and emg.role = 'PRIMARY'
      )`)
    )
    .$if(filters.search !== undefined, (builder) =>
      builder.where(exerciseSearchPredicate(filters))
    );

  for (const muscleGroupId of filters.muscleGroupIds) {
    query = query.where(sql<boolean>`exists (
      select 1 from exercise_muscle_groups emg
      where emg.exercise_id = exercises.id
        and emg.muscle_group_id = ${muscleGroupId}
    )`);
  }

  if (filters.equipment === "unspecified") {
    query = query.where("equipment", "is", null);
  } else if (filters.equipment) {
    query = query.where("equipment", "=", filters.equipment);
  }

  if (filters.exerciseType === "unspecified") {
    query = query.where("exercise_type", "is", null);
  } else if (filters.exerciseType) {
    query = query.where("exercise_type", "=", filters.exerciseType);
  }

  if (filters.ownership === "editable") {
    query = query.where("created_by_user_id", "=", filters.userId!);
  } else if (filters.ownership === "readOnly") {
    query = query.where(sql<boolean>`(
      created_by_user_id is null
      or created_by_user_id <> ${filters.userId}
    )`);
  }

  const row = await query.executeTakeFirstOrThrow();
  return Number(row.total);
}

function exerciseSearchPredicate(filters: ExerciseListFilters) {
  const search = filters.search?.toLowerCase() ?? "";
  return sql<boolean>`(
    lower(exercises.name) like ${`%${search}%`}
    or ${aliasNamePredicate(filters.searchAliases)}
    or similarity(lower(exercises.name), ${search}) >= ${searchSimilarityThreshold(search)}
    or lower(coalesce(exercises.equipment, '')) like ${`%${search}%`}
    or exists (
      select 1
      from exercise_muscle_groups emg
      join muscle_groups mg on mg.id = emg.muscle_group_id
      where emg.exercise_id = exercises.id
        and lower(mg.name) like ${`%${search}%`}
    )
  )`;
}

function aliasNamePredicate(aliases: string[]) {
  if (aliases.length === 0) return sql<boolean>`false`;
  return sql<boolean>`lower(exercises.name) in (${sql.join(
    aliases.map((alias) => sql`${alias.toLowerCase()}`)
  )})`;
}

function searchSimilarityThreshold(search: string): number {
  if (search.length <= 3) return 0.62;
  if (search.length <= 5) return 0.45;
  return 0.32;
}

export async function findExerciseByIdOrThrow(
  db: Kysely<AppDatabase>,
  exerciseId: string
): Promise<ExerciseRecord> {
  const row = await db
    .selectFrom("exercises")
    .innerJoin("muscle_groups", "muscle_groups.id", "exercises.primary_muscle_group_id")
    .select(exerciseSelection)
    .where("exercises.id", "=", exerciseId)
    .executeTakeFirstOrThrow();
  const muscles = await findExerciseMuscleGroups(db, [exerciseId]);
  return toExerciseRecord(row, muscles.get(exerciseId) ?? []);
}

interface ExerciseMuscleRecord extends MuscleGroupRecord {
  role: "PRIMARY" | "SECONDARY";
}

export async function findExerciseMuscleGroups(
  db: Kysely<AppDatabase>,
  exerciseIds: string[]
): Promise<Map<string, ExerciseMuscleRecord[]>> {
  const grouped = new Map<string, ExerciseMuscleRecord[]>();
  if (exerciseIds.length === 0) return grouped;

  const rows = await db
    .selectFrom("exercise_muscle_groups")
    .innerJoin("muscle_groups", "muscle_groups.id", "exercise_muscle_groups.muscle_group_id")
    .select([
      "exercise_muscle_groups.exercise_id as exerciseId",
      "exercise_muscle_groups.role as role",
      "muscle_groups.id as id",
      "muscle_groups.slug as slug",
      "muscle_groups.name as name",
      "muscle_groups.sort_order as sortOrder"
    ])
    .where("exercise_muscle_groups.exercise_id", "in", exerciseIds)
    .orderBy(sql<number>`case when exercise_muscle_groups.role = 'PRIMARY' then 0 else 1 end`)
    .orderBy("muscle_groups.sort_order", "asc")
    .execute();

  for (const row of rows) {
    grouped.set(row.exerciseId, [
      ...(grouped.get(row.exerciseId) ?? []),
      { id: row.id, slug: row.slug, name: row.name, sortOrder: row.sortOrder, role: row.role }
    ]);
  }

  return grouped;
}

export async function replaceExerciseMuscles(
  db: Kysely<AppDatabase>,
  exerciseId: string,
  primaryMuscleGroupIds: string[],
  secondaryMuscleGroupIds: string[]
): Promise<void> {
  await db.deleteFrom("exercise_muscle_groups").where("exercise_id", "=", exerciseId).execute();
  await db.deleteFrom("exercise_secondary_muscles").where("exercise_id", "=", exerciseId).execute();
  await db.insertInto("exercise_muscle_groups").values([
    ...primaryMuscleGroupIds.map((muscleGroupId) => ({ exercise_id: exerciseId, muscle_group_id: muscleGroupId, role: "PRIMARY" as const })),
    ...secondaryMuscleGroupIds.map((muscleGroupId) => ({ exercise_id: exerciseId, muscle_group_id: muscleGroupId, role: "SECONDARY" as const }))
  ]).execute();

  if (secondaryMuscleGroupIds.length > 0) {
    await db.insertInto("exercise_secondary_muscles").values(
      secondaryMuscleGroupIds.map((muscleGroupId) => ({ exercise_id: exerciseId, muscle_group_id: muscleGroupId }))
    ).execute();
  }
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

export function toExerciseRecord(
  row: ExerciseRow,
  muscles: ExerciseMuscleRecord[]
): ExerciseRecord {
  const primaryMuscleGroups = muscles.filter((muscle) => muscle.role === "PRIMARY");
  const secondaryMuscleGroups = muscles.filter((muscle) => muscle.role === "SECONDARY");
  const primaryMuscleGroup = primaryMuscleGroups[0] ?? {
    id: row.primaryMuscleGroupId,
    slug: row.primaryMuscleGroupSlug,
    name: row.primaryMuscleGroupName,
    sortOrder: row.primaryMuscleGroupSortOrder
  };

  return {
    id: row.id,
    name: row.name,
    equipment: row.equipment,
    exerciseType: row.exerciseType,
    primaryMuscleGroup,
    primaryMuscleGroups,
    secondaryMuscleGroups,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export function toMuscleGroupRecord(row: MuscleGroupRecord): MuscleGroupRecord {
  return { id: row.id, slug: row.slug, name: row.name, sortOrder: row.sortOrder };
}

export function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
