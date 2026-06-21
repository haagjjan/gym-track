import { sql, type Kysely } from "kysely";
import type { AppDatabase } from "../../db/database.js";
import type { AddSetRequest, UpdateSetRequest } from "./workout-logging.schemas.js";
import {
  compactExercisePositions,
  compactSetOrder,
  countActiveRows,
  findSelectableExercise,
  findSessionExerciseByIdOrThrow,
  findSetByUser,
  setSelection,
  shiftExercisePositions,
  toSetInsert,
  toSetRecord,
  toSetUpdate
} from "./workout-logging.repository.helpers.js";

interface MuscleGroupRecord {
  id: string;
  slug: string;
  name: string;
}

export interface SelectableExerciseRecord {
  id: string;
  name: string;
  primaryMuscleGroup: MuscleGroupRecord;
}

export interface SessionExerciseRecord {
  id: string;
  position: number;
  exercise: SelectableExerciseRecord;
}

export interface SetRecord {
  id: string;
  sessionExerciseId: string;
  setOrder: number;
  setType: "warmup" | "working";
  weightKg: string;
  reps: number;
  rir: number;
  restTimeSeconds: number | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkoutLoggingRepository {
  workoutExists(userId: string, workoutId: string): Promise<boolean>;
  findSelectableExercise(exerciseId: string): Promise<SelectableExerciseRecord | null>;
  countSessionExercises(workoutId: string): Promise<number>;
  addSessionExercise(input: {
    id: string;
    workoutId: string;
    exerciseId: string;
    position: number;
  }): Promise<SessionExerciseRecord>;
  listSessionExerciseIds(workoutId: string): Promise<string[]>;
  reorderSessionExercises(
    workoutId: string,
    items: { sessionExerciseId: string; position: number }[],
    updatedAt: Date
  ): Promise<void>;
  deleteSessionExercise(
    workoutId: string,
    sessionExerciseId: string,
    deletedAt: Date
  ): Promise<boolean>;
  sessionExerciseExists(
    userId: string,
    workoutId: string,
    sessionExerciseId: string
  ): Promise<boolean>;
  countSets(sessionExerciseId: string): Promise<number>;
  addSet(input: {
    id: string;
    sessionExerciseId: string;
    setOrder: number;
    values: AddSetRequest;
  }): Promise<SetRecord>;
  setExists(userId: string, setId: string): Promise<SetRecord | null>;
  updateSet(setId: string, input: UpdateSetRequest, updatedAt: Date): Promise<SetRecord>;
  deleteSet(setId: string, deletedAt: Date): Promise<boolean>;
}

export function createWorkoutLoggingRepository(
  db: Kysely<AppDatabase>
): WorkoutLoggingRepository {
  return {
    async workoutExists(userId, workoutId) {
      const row = await db
        .selectFrom("workout_sessions")
        .select("id")
        .where("id", "=", workoutId)
        .where("user_id", "=", userId)
        .where("deleted_at", "is", null)
        .executeTakeFirst();

      return row !== undefined;
    },
    async findSelectableExercise(exerciseId) {
      return findSelectableExercise(db, exerciseId);
    },
    async countSessionExercises(workoutId) {
      return countActiveRows(db, "session_exercises", "workout_session_id", workoutId);
    },
    async addSessionExercise(input) {
      await db.transaction().execute(async (trx) => {
        await shiftExercisePositions(trx, input.workoutId, input.position);
        await trx
          .insertInto("session_exercises")
          .values({
            id: input.id,
            workout_session_id: input.workoutId,
            exercise_id: input.exerciseId,
            position: input.position
          })
          .execute();
      });

      return findSessionExerciseByIdOrThrow(db, input.id);
    },
    async listSessionExerciseIds(workoutId) {
      const rows = await db
        .selectFrom("session_exercises")
        .select("id")
        .where("workout_session_id", "=", workoutId)
        .where("deleted_at", "is", null)
        .orderBy("position", "asc")
        .execute();

      return rows.map((row) => row.id);
    },
    async reorderSessionExercises(workoutId, items, updatedAt) {
      await db.transaction().execute(async (trx) => {
        await trx
          .updateTable("session_exercises")
          .set({ position: sql<number>`position + 10000` })
          .where("workout_session_id", "=", workoutId)
          .where("deleted_at", "is", null)
          .execute();

        for (const item of items) {
          await trx
            .updateTable("session_exercises")
            .set({ position: item.position, updated_at: updatedAt })
            .where("id", "=", item.sessionExerciseId)
            .execute();
        }
      });
    },
    async deleteSessionExercise(workoutId, sessionExerciseId, deletedAt) {
      return db.transaction().execute(async (trx) => {
        const result = await trx
          .updateTable("session_exercises")
          .set({ deleted_at: deletedAt, updated_at: deletedAt })
          .where("id", "=", sessionExerciseId)
          .where("workout_session_id", "=", workoutId)
          .where("deleted_at", "is", null)
          .executeTakeFirst();

        if (Number(result.numUpdatedRows) === 0) {
          return false;
        }

        await trx
          .updateTable("sets")
          .set({ deleted_at: deletedAt, updated_at: deletedAt })
          .where("session_exercise_id", "=", sessionExerciseId)
          .where("deleted_at", "is", null)
          .execute();
        await compactExercisePositions(trx, workoutId, deletedAt);

        return true;
      });
    },
    async sessionExerciseExists(userId, workoutId, sessionExerciseId) {
      const row = await db
        .selectFrom("session_exercises")
        .innerJoin("workout_sessions", "workout_sessions.id", "session_exercises.workout_session_id")
        .select("session_exercises.id")
        .where("session_exercises.id", "=", sessionExerciseId)
        .where("session_exercises.workout_session_id", "=", workoutId)
        .where("session_exercises.deleted_at", "is", null)
        .where("workout_sessions.user_id", "=", userId)
        .where("workout_sessions.deleted_at", "is", null)
        .executeTakeFirst();

      return row !== undefined;
    },
    async countSets(sessionExerciseId) {
      return countActiveRows(db, "sets", "session_exercise_id", sessionExerciseId);
    },
    async addSet(input) {
      const row = await db
        .insertInto("sets")
        .values(toSetInsert(input))
        .returning(setSelection)
        .executeTakeFirstOrThrow();

      return toSetRecord(row);
    },
    async setExists(userId, setId) {
      const row = await findSetByUser(db, userId, setId);

      return row ? toSetRecord(row) : null;
    },
    async updateSet(setId, input, updatedAt) {
      const row = await db
        .updateTable("sets")
        .set(toSetUpdate(input, updatedAt))
        .where("id", "=", setId)
        .where("deleted_at", "is", null)
        .returning(setSelection)
        .executeTakeFirstOrThrow();

      return toSetRecord(row);
    },
    async deleteSet(setId, deletedAt) {
      return db.transaction().execute(async (trx) => {
        const existing = await trx
          .selectFrom("sets")
          .select("session_exercise_id as sessionExerciseId")
          .where("id", "=", setId)
          .where("deleted_at", "is", null)
          .executeTakeFirst();

        if (!existing) {
          return false;
        }

        await trx
          .updateTable("sets")
          .set({ deleted_at: deletedAt, updated_at: deletedAt })
          .where("id", "=", setId)
          .execute();
        await compactSetOrder(trx, existing.sessionExerciseId, deletedAt);

        return true;
      });
    }
  };
}
