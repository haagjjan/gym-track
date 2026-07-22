import type { Kysely } from "kysely";
import type { AppDatabase } from "../../db/database.js";
import { findWorkoutDetail, type WorkoutDetailRecord } from "./workout-detail.repository.js";
import { listWorkoutRecords } from "./workout-list.repository.js";
import { toWorkoutSessionRecord, workoutSessionSelection } from "./workout-records.js";

export type { WorkoutDetailRecord } from "./workout-detail.repository.js";

export interface NewWorkoutSession {
  id: string;
  userId: string;
  startedAt: Date;
  workoutType: string | null;
  title: string | null;
  notes: string | null;
}

export interface WorkoutSessionRecord {
  id: string;
  userId: string;
  startedAt: Date;
  endedAt: Date | null;
  workoutType: string | null;
  title: string | null;
  notes: string | null;
  sourceTemplateId?: string | null;
}

export interface WorkoutListRecord extends WorkoutSessionRecord {
  totalExercises: number;
  totalSets: number;
  tonnageKg: string;
  exercisePreview: Array<{
    id: string;
    name: string;
    equipment: string | null;
    exerciseType: string | null;
  }>;
}

export interface AllTimeWorkoutSummaryRecord {
  totalSessions: number;
  completedSessions: number;
  cumulativeTonnageKg: string;
  averageCompletedDurationSeconds: number | null;
  completionRate: number;
}

export interface WorkoutListFilters {
  userId: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
  search: string | undefined;
  muscleGroupIds: string[];
  equipment: string | "unspecified" | undefined;
  exerciseType: string | "unspecified" | undefined;
  sort: "newest" | "oldest" | "name";
  timeZone: string;
  limit: number;
  offset: number;
}

export type CreateWorkoutResult =
  | { status: "created"; workout: WorkoutSessionRecord }
  | { status: "conflict" };

export interface WorkoutListResult {
  items: WorkoutListRecord[];
  total: number;
  allTimeSummary: AllTimeWorkoutSummaryRecord;
}

export interface WorkoutSessionPatch {
  startedAt?: Date;
  endedAt?: Date;
  title?: string | null;
}

export interface WorkoutRepository {
  createWorkout(workout: NewWorkoutSession): Promise<CreateWorkoutResult>;
  listWorkouts(filters: WorkoutListFilters): Promise<WorkoutListResult>;
  findWorkoutSession(userId: string, workoutId: string): Promise<WorkoutSessionRecord | null>;
  findWorkoutDetail(userId: string, workoutId: string): Promise<WorkoutDetailRecord | null>;
  endWorkout(
    userId: string,
    workoutId: string,
    endedAt: Date,
    updatedAt: Date
  ): Promise<WorkoutDetailRecord | null>;
  updateWorkout(
    userId: string,
    workoutId: string,
    patch: WorkoutSessionPatch,
    updatedAt: Date
  ): Promise<WorkoutDetailRecord | null>;
  deleteWorkout(
    userId: string,
    workoutId: string,
    deletedAt: Date
  ): Promise<WorkoutSessionRecord | null>;
}

export function createWorkoutRepository(db: Kysely<AppDatabase>): WorkoutRepository {
  return {
    async createWorkout(workout) {
      try {
        const inserted = await db
          .insertInto("workout_sessions")
          .values({
            id: workout.id,
            user_id: workout.userId,
            started_at: workout.startedAt,
            workout_type: workout.workoutType,
            title: workout.title,
            notes: workout.notes
          })
          .returning(workoutSessionSelection)
          .executeTakeFirstOrThrow();

        return {
          status: "created",
          workout: toWorkoutSessionRecord(inserted)
        };
      } catch (error) {
        if (isUniqueViolation(error)) {
          return { status: "conflict" };
        }

        throw error;
      }
    },
    async listWorkouts(filters) {
      return listWorkoutRecords(db, filters);
    },
    async findWorkoutSession(userId, workoutId) {
      const row = await db
        .selectFrom("workout_sessions")
        .select(workoutSessionSelection)
        .where("id", "=", workoutId)
        .where("user_id", "=", userId)
        .where("deleted_at", "is", null)
        .executeTakeFirst();

      return row ? toWorkoutSessionRecord(row) : null;
    },
    async findWorkoutDetail(userId, workoutId) {
      return findWorkoutDetail(db, userId, workoutId);
    },
    async endWorkout(userId, workoutId, endedAt, updatedAt) {
      const updated = await db
        .updateTable("workout_sessions")
        .set({
          ended_at: endedAt,
          updated_at: updatedAt
        })
        .where("id", "=", workoutId)
        .where("user_id", "=", userId)
        .where("deleted_at", "is", null)
        .where("ended_at", "is", null)
        .returning(workoutSessionSelection)
        .executeTakeFirst();

      if (!updated) {
        return null;
      }

      return findWorkoutDetail(db, userId, updated.id);
    },
    async updateWorkout(userId, workoutId, patch, updatedAt) {
      const updated = await db
        .updateTable("workout_sessions")
        .set({
          ...(patch.startedAt !== undefined ? { started_at: patch.startedAt } : {}),
          ...(patch.endedAt !== undefined ? { ended_at: patch.endedAt } : {}),
          ...(patch.title !== undefined ? { title: patch.title } : {}),
          updated_at: updatedAt
        })
        .where("id", "=", workoutId)
        .where("user_id", "=", userId)
        .where("deleted_at", "is", null)
        .returning(workoutSessionSelection)
        .executeTakeFirst();

      if (!updated) {
        return null;
      }

      return findWorkoutDetail(db, userId, updated.id);
    },
    async deleteWorkout(userId, workoutId, deletedAt) {
      const deleted = await db
        .updateTable("workout_sessions")
        .set({
          deleted_at: deletedAt,
          updated_at: deletedAt
        })
        .where("id", "=", workoutId)
        .where("user_id", "=", userId)
        .where("deleted_at", "is", null)
        .returning(workoutSessionSelection)
        .executeTakeFirst();

      return deleted ? toWorkoutSessionRecord(deleted) : null;
    }
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
