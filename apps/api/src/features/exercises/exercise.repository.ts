import { sql, type Kysely } from "kysely";
import type { AppDatabase } from "../../db/database.js";
import { mergeExerciseHistory } from "./exercise-merge.repository.js";
import {
  countExerciseRows,
  exerciseSelection,
  findExerciseByIdOrThrow,
  findExerciseMuscleGroups,
  isUniqueViolation,
  listExerciseRows,
  muscleGroupSelection,
  replaceExerciseMuscles,
  toExerciseRecord,
  toMuscleGroupRecord
} from "./exercise-records.repository.js";

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
  primaryMuscleGroups: MuscleGroupRecord[];
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
  muscleGroupIds: string[];
  primaryMuscleGroupId: string | undefined;
  equipment: string | "unspecified" | undefined;
  exerciseType: string | "unspecified" | undefined;
  ownership: "editable" | "readOnly" | undefined;
  userId: string | undefined;
  sort: "name" | "muscle" | "equipment" | "type";
  limit: number;
  offset: number;
}

export interface NewExercise {
  id: string;
  name: string;
  equipment: string | null;
  exerciseType: string | null;
  primaryMuscleGroupIds: string[];
  secondaryMuscleGroupIds: string[];
  createdByUserId: string;
}

export interface RestoreExerciseInput {
  id: string;
  name: string;
  equipment: string | null;
  exerciseType: string | null;
  primaryMuscleGroupIds: string[];
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

export interface MergeExerciseHistoryResult {
  reassignedSessionExercises: number;
  reassignedTemplateExercises: number;
  affectedWorkouts: number;
  affectedTemplates: number;
  affectedSets: number;
  sourceRetired: boolean;
}

export interface ExerciseRepository {
  listExercises(filters: ExerciseListFilters): Promise<ExerciseListResult>;
  listMuscleGroups(): Promise<MuscleGroupRecord[]>;
  findExerciseByName(name: string): Promise<ExistingExerciseRecord | null>;
  findActiveExerciseById(exerciseId: string): Promise<ExerciseRecord | null>;
  findMuscleGroupsByIds(ids: string[]): Promise<MuscleGroupRecord[]>;
  createExercise(input: NewExercise): Promise<CreateExerciseResult>;
  restoreExercise(input: RestoreExerciseInput): Promise<ExerciseRecord>;
  updateExercise(input: RestoreExerciseInput): Promise<ExerciseRecord | null>;
  mergeExerciseHistory(
    userId: string,
    sourceExerciseId: string,
    targetExerciseId: string,
    mergedAt: Date
  ): Promise<MergeExerciseHistoryResult>;
}

export function createExerciseRepository(db: Kysely<AppDatabase>): ExerciseRepository {
  return {
    async listExercises(filters) {
      const rows = await listExerciseRows(db, filters);
      const total = await countExerciseRows(db, filters);
      const muscles = await findExerciseMuscleGroups(
        db,
        rows.map((row) => row.id)
      );

      return {
        items: rows.map((row) => toExerciseRecord(row, muscles.get(row.id) ?? [])),
        total
      };
    },
    async listMuscleGroups() {
      const rows = await db
        .selectFrom("muscle_groups")
        .select(muscleGroupSelection)
        .orderBy("sort_order", "asc")
        .execute();

      return rows.map(toMuscleGroupRecord);
    },
    async findExerciseByName(name) {
      const row = await db
        .selectFrom("exercises")
        .select(["id", "deleted_at as deletedAt"])
        .where(sql<string>`lower(name)`, "=", name.toLowerCase())
        .executeTakeFirst();

      return row ?? null;
    },
    async findActiveExerciseById(exerciseId) {
      const row = await db
        .selectFrom("exercises")
        .innerJoin("muscle_groups", "muscle_groups.id", "exercises.primary_muscle_group_id")
        .select(exerciseSelection)
        .where("exercises.id", "=", exerciseId)
        .where("exercises.deleted_at", "is", null)
        .executeTakeFirst();

      if (!row) {
        return null;
      }

      const muscles = await findExerciseMuscleGroups(db, [exerciseId]);

      return toExerciseRecord(row, muscles.get(exerciseId) ?? []);
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
              primary_muscle_group_id: input.primaryMuscleGroupIds[0]!,
              created_by_user_id: input.createdByUserId
            })
            .returning("id")
            .executeTakeFirstOrThrow();

          await replaceExerciseMuscles(
            trx,
            inserted.id,
            input.primaryMuscleGroupIds,
            input.secondaryMuscleGroupIds
          );

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
            primary_muscle_group_id: input.primaryMuscleGroupIds[0]!,
            updated_at: input.updatedAt,
            deleted_at: null
          })
          .where("id", "=", input.id)
          .executeTakeFirstOrThrow();

        await replaceExerciseMuscles(
          trx,
          input.id,
          input.primaryMuscleGroupIds,
          input.secondaryMuscleGroupIds
        );
      });

      return findExerciseByIdOrThrow(db, input.id);
    },
    async updateExercise(input) {
      const updated = await db.transaction().execute(async (trx) => {
        const result = await trx
          .updateTable("exercises")
          .set({
            name: input.name,
            equipment: input.equipment,
            exercise_type: input.exerciseType,
            primary_muscle_group_id: input.primaryMuscleGroupIds[0]!,
            updated_at: input.updatedAt
          })
          .where("id", "=", input.id)
          .where("deleted_at", "is", null)
          .executeTakeFirst();

        if (Number(result.numUpdatedRows) === 0) {
          return false;
        }

        await replaceExerciseMuscles(
          trx,
          input.id,
          input.primaryMuscleGroupIds,
          input.secondaryMuscleGroupIds
        );

        return true;
      });

      if (!updated) {
        return null;
      }

      return findExerciseByIdOrThrow(db, input.id);
    },
    async mergeExerciseHistory(userId, sourceExerciseId, targetExerciseId, mergedAt) {
      return mergeExerciseHistory(db, userId, sourceExerciseId, targetExerciseId, mergedAt);
    }
  };
}
