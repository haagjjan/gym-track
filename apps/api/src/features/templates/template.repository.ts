import type { Kysely } from "kysely";
import type { AppDatabase } from "../../db/database.js";
import {
  findTemplate,
  findTemplateBase,
  findTemplateOrThrow,
  hydrateTemplates,
  insertSessionExercises,
  insertTemplate,
  isUniqueViolation,
  listCompletedWorkoutExerciseIds,
  listTemplateExerciseIds,
  replaceTemplateExercises,
  sortTemplates,
  templateFilterExpression,
  templateSelection
} from "./template-records.repository.js";

export { exerciseSignature } from "./template-records.repository.js";

export interface TemplateMuscleRecord {
  id: string;
  slug: string;
  name: string;
  role: "PRIMARY" | "SECONDARY";
  sortOrder: number;
}

export interface TemplateExerciseRecord {
  id: string;
  position: number;
  exercise: {
    id: string;
    name: string;
    equipment: string | null;
    exerciseType: string | null;
    muscleGroups: TemplateMuscleRecord[];
  };
}

export interface TemplateRecord {
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt: Date | null;
  exercises: TemplateExerciseRecord[];
}

export interface TemplateListFilters {
  search: string | undefined;
  muscleGroupIds: string[];
  equipment: string | "unspecified" | undefined;
  exerciseType: string | "unspecified" | undefined;
  sort: "lastUsed" | "name" | "lastEdited";
}

export interface NewTemplate {
  id: string;
  userId: string;
  name: string;
  exerciseIds: string[];
  createdAt: Date;
}

export interface StartedTemplateWorkout {
  workoutId: string;
  template: TemplateRecord;
}

export interface TemplateRepository {
  listTemplates(userId: string, filters: TemplateListFilters): Promise<TemplateRecord[]>;
  findTemplate(userId: string, templateId: string): Promise<TemplateRecord | null>;
  findSelectableExerciseIds(exerciseIds: string[]): Promise<string[]>;
  createTemplate(input: NewTemplate): Promise<TemplateRecord>;
  updateTemplate(
    userId: string,
    templateId: string,
    patch: { name?: string; exerciseIds?: string[] },
    updatedAt: Date
  ): Promise<TemplateRecord | null>;
  duplicateTemplate(
    userId: string,
    templateId: string,
    newTemplateId: string,
    name: string | undefined,
    createdAt: Date
  ): Promise<TemplateRecord | null>;
  deleteTemplate(userId: string, templateId: string): Promise<boolean>;
  startWorkout(
    userId: string,
    templateId: string,
    workoutId: string,
    startedAt: Date
  ): Promise<StartedTemplateWorkout | "open_workout_exists" | null>;
  createFromWorkout(input: {
    id: string;
    userId: string;
    workoutId: string;
    name: string;
    createdAt: Date;
  }): Promise<TemplateRecord | null>;
  updateFromWorkout(
    userId: string,
    templateId: string,
    workoutId: string,
    updatedAt: Date
  ): Promise<TemplateRecord | null>;
}

export function createTemplateRepository(db: Kysely<AppDatabase>): TemplateRepository {
  return {
    async listTemplates(userId, filters) {
      const rows = await db
        .selectFrom("workout_templates")
        .select(templateSelection)
        .where("user_id", "=", userId)
        .where(templateFilterExpression(filters))
        .execute();

      return sortTemplates(await hydrateTemplates(db, rows.map((row) => ({ ...row }))), filters.sort);
    },
    async findTemplate(userId, templateId) {
      return findTemplate(db, userId, templateId);
    },
    async findSelectableExerciseIds(exerciseIds) {
      if (exerciseIds.length === 0) {
        return [];
      }

      const rows = await db
        .selectFrom("exercises")
        .select("id")
        .where("id", "in", [...new Set(exerciseIds)])
        .where("deleted_at", "is", null)
        .execute();

      return rows.map((row) => row.id);
    },
    async createTemplate(input) {
      await db.transaction().execute(async (trx) => {
        await insertTemplate(trx, input);
      });

      return findTemplateOrThrow(db, input.userId, input.id);
    },
    async updateTemplate(userId, templateId, patch, updatedAt) {
      const changed = await db.transaction().execute(async (trx) => {
        const result = await trx
          .updateTable("workout_templates")
          .set({ ...(patch.name ? { name: patch.name } : {}), updated_at: updatedAt })
          .where("id", "=", templateId)
          .where("user_id", "=", userId)
          .executeTakeFirst();

        if (Number(result.numUpdatedRows) === 0) {
          return false;
        }

        if (patch.exerciseIds) {
          await replaceTemplateExercises(trx, templateId, patch.exerciseIds);
        }

        return true;
      });

      return changed ? findTemplateOrThrow(db, userId, templateId) : null;
    },
    async duplicateTemplate(userId, templateId, newTemplateId, name, createdAt) {
      const created = await db.transaction().execute(async (trx) => {
        const source = await findTemplateBase(trx, userId, templateId);

        if (!source) {
          return false;
        }

        const exerciseIds = await listTemplateExerciseIds(trx, templateId);
        await insertTemplate(trx, {
          id: newTemplateId,
          userId,
          name: name ?? `${source.name} Copy`,
          exerciseIds,
          createdAt
        });

        return true;
      });

      return created ? findTemplateOrThrow(db, userId, newTemplateId) : null;
    },
    async deleteTemplate(userId, templateId) {
      const result = await db
        .deleteFrom("workout_templates")
        .where("id", "=", templateId)
        .where("user_id", "=", userId)
        .executeTakeFirst();

      return Number(result.numDeletedRows) > 0;
    },
    async startWorkout(userId, templateId, workoutId, startedAt) {
      try {
        const template = await db.transaction().execute(async (trx) => {
          const source = await findTemplateBase(trx, userId, templateId);

          if (!source) {
            return null;
          }

          const exerciseIds = await listTemplateExerciseIds(trx, templateId);
          await trx.insertInto("workout_sessions").values({
            id: workoutId,
            user_id: userId,
            started_at: startedAt,
            title: source.name,
            source_template_id: templateId
          }).execute();
          await insertSessionExercises(trx, workoutId, exerciseIds);

          return source;
        });

        if (!template) {
          return null;
        }

        return { workoutId, template: await findTemplateOrThrow(db, userId, templateId) };
      } catch (error) {
        return isUniqueViolation(error) ? "open_workout_exists" : Promise.reject(error);
      }
    },
    async createFromWorkout(input) {
      const created = await db.transaction().execute(async (trx) => {
        const exerciseIds = await listCompletedWorkoutExerciseIds(
          trx,
          input.userId,
          input.workoutId
        );

        if (!exerciseIds) {
          return false;
        }

        await insertTemplate(trx, { ...input, exerciseIds });
        return true;
      });

      return created ? findTemplateOrThrow(db, input.userId, input.id) : null;
    },
    async updateFromWorkout(userId, templateId, workoutId, updatedAt) {
      const updated = await db.transaction().execute(async (trx) => {
        const template = await findTemplateBase(trx, userId, templateId);
        const exerciseIds = await listCompletedWorkoutExerciseIds(trx, userId, workoutId);

        if (!template || !exerciseIds) {
          return false;
        }

        await replaceTemplateExercises(trx, templateId, exerciseIds);
        await trx.updateTable("workout_templates")
          .set({ updated_at: updatedAt })
          .where("id", "=", templateId)
          .execute();
        return true;
      });

      return updated ? findTemplateOrThrow(db, userId, templateId) : null;
    }
  };
}
