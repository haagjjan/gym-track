import { randomUUID } from "node:crypto";
import type {
  CreateTemplateRequest,
  ListTemplatesQuery,
  UpdateTemplateRequest
} from "./template.schemas.js";
import type {
  TemplateRecord,
  TemplateRepository
} from "./template.repository.js";

export interface TemplateShape {
  id: string;
  name: string;
  exercises: Array<{
    id: string;
    position: number;
    exercise: {
      id: string;
      name: string;
      equipment: string | null;
      exerciseType: string | null;
      muscleGroups: Array<{
        id: string;
        slug: string;
        name: string;
        role: "PRIMARY" | "SECONDARY";
      }>;
    };
  }>;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
}

export type TemplateResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: "not_found" | "exercise_not_found" | "open_workout_exists" };

export interface TemplateService {
  listTemplates(userId: string, input: ListTemplatesQuery): Promise<TemplateShape[]>;
  getTemplate(userId: string, templateId: string): Promise<TemplateResult<TemplateShape>>;
  createTemplate(userId: string, input: CreateTemplateRequest): Promise<TemplateResult<TemplateShape>>;
  updateTemplate(userId: string, templateId: string, input: UpdateTemplateRequest): Promise<TemplateResult<TemplateShape>>;
  duplicateTemplate(userId: string, templateId: string, name?: string): Promise<TemplateResult<TemplateShape>>;
  deleteTemplate(userId: string, templateId: string): Promise<TemplateResult<{ deleted: true }>>;
  startWorkout(userId: string, templateId: string): Promise<TemplateResult<{ workoutId: string }>>;
  createFromWorkout(userId: string, workoutId: string, name: string): Promise<TemplateResult<TemplateShape>>;
  updateFromWorkout(userId: string, templateId: string, workoutId: string): Promise<TemplateResult<TemplateShape>>;
}

export function createTemplateService(options: {
  repository: TemplateRepository;
  now?: () => Date;
}): TemplateService {
  const now = options.now ?? (() => new Date());

  async function exercisesExist(exerciseIds: string[]): Promise<boolean> {
    const uniqueIds = [...new Set(exerciseIds)];
    const found = await options.repository.findSelectableExerciseIds(uniqueIds);
    return found.length === uniqueIds.length;
  }

  return {
    async listTemplates(userId, input) {
      return (await options.repository.listTemplates(userId, {
        search: input.search,
        muscleGroupIds: input.muscleGroupIds ?? [],
        equipment: input.equipment,
        exerciseType: input.exerciseType,
        sort: input.sort ?? "lastUsed"
      })).map(toTemplateShape);
    },
    async getTemplate(userId, templateId) {
      const template = await options.repository.findTemplate(userId, templateId);
      return template ? ok(toTemplateShape(template)) : { ok: false, reason: "not_found" };
    },
    async createTemplate(userId, input) {
      if (!(await exercisesExist(input.exerciseIds))) {
        return { ok: false, reason: "exercise_not_found" };
      }

      const createdAt = now();
      const template = await options.repository.createTemplate({
        id: randomUUID(), userId, name: input.name, exerciseIds: input.exerciseIds, createdAt
      });
      return ok(toTemplateShape(template));
    },
    async updateTemplate(userId, templateId, input) {
      if (input.exerciseIds && !(await exercisesExist(input.exerciseIds))) {
        return { ok: false, reason: "exercise_not_found" };
      }

      const patch = {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.exerciseIds !== undefined ? { exerciseIds: input.exerciseIds } : {})
      };
      const template = await options.repository.updateTemplate(userId, templateId, patch, now());
      return template ? ok(toTemplateShape(template)) : { ok: false, reason: "not_found" };
    },
    async duplicateTemplate(userId, templateId, name) {
      const template = await options.repository.duplicateTemplate(
        userId, templateId, randomUUID(), name, now()
      );
      return template ? ok(toTemplateShape(template)) : { ok: false, reason: "not_found" };
    },
    async deleteTemplate(userId, templateId) {
      return (await options.repository.deleteTemplate(userId, templateId))
        ? ok({ deleted: true as const })
        : { ok: false, reason: "not_found" };
    },
    async startWorkout(userId, templateId) {
      const template = await options.repository.findTemplate(userId, templateId);

      if (!template) {
        return { ok: false, reason: "not_found" };
      }

      if (!(await exercisesExist(template.exercises.map((entry) => entry.exercise.id)))) {
        return { ok: false, reason: "exercise_not_found" };
      }

      const result = await options.repository.startWorkout(
        userId, templateId, randomUUID(), now()
      );
      if (result === "open_workout_exists") return { ok: false, reason: result };
      return result ? ok({ workoutId: result.workoutId }) : { ok: false, reason: "not_found" };
    },
    async createFromWorkout(userId, workoutId, name) {
      const template = await options.repository.createFromWorkout({
        id: randomUUID(), userId, workoutId, name, createdAt: now()
      });
      return template ? ok(toTemplateShape(template)) : { ok: false, reason: "not_found" };
    },
    async updateFromWorkout(userId, templateId, workoutId) {
      const template = await options.repository.updateFromWorkout(
        userId, templateId, workoutId, now()
      );
      return template ? ok(toTemplateShape(template)) : { ok: false, reason: "not_found" };
    }
  };
}

function ok<T>(value: T): { ok: true; value: T } {
  return { ok: true, value };
}

function toTemplateShape(record: TemplateRecord): TemplateShape {
  return {
    id: record.id,
    name: record.name,
    exercises: record.exercises.map((entry) => ({
      id: entry.id,
      position: entry.position,
      exercise: {
        id: entry.exercise.id,
        name: entry.exercise.name,
        equipment: entry.exercise.equipment,
        exerciseType: entry.exercise.exerciseType,
        muscleGroups: entry.exercise.muscleGroups.map((muscle) => ({
          id: muscle.id,
          slug: muscle.slug,
          name: muscle.name,
          role: muscle.role
        }))
      }
    })),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    lastUsedAt: record.lastUsedAt?.toISOString() ?? null
  };
}
