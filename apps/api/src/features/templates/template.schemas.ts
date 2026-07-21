import { z } from "zod";
import { EXERCISE_EQUIPMENT, EXERCISE_TYPES } from "../exercises/exercise-classifications.js";

const templateNameSchema = z.string().trim().min(1).max(120);
const exerciseIdsSchema = z.array(z.string().uuid()).max(100);

export const templateParamsSchema = z.object({ templateId: z.string().uuid() });
export const workoutTemplateParamsSchema = z.object({ workoutId: z.string().uuid() });
export const listTemplatesQuerySchema = z.object({
  search: z.string().trim().max(120).transform((value) => value || undefined).optional(),
  muscleGroupIds: queryArraySchema(z.string().uuid()).optional(),
  equipment: z.enum([...EXERCISE_EQUIPMENT, "unspecified"]).optional(),
  exerciseType: z.enum([...EXERCISE_TYPES, "unspecified"]).optional(),
  sort: z.enum(["lastUsed", "name", "lastEdited"]).optional()
});

export const createTemplateRequestSchema = z.object({
  name: templateNameSchema,
  exerciseIds: exerciseIdsSchema.default([])
});

export const updateTemplateRequestSchema = z
  .object({
    name: templateNameSchema.optional(),
    exerciseIds: exerciseIdsSchema.optional()
  })
  .refine((value) => value.name !== undefined || value.exerciseIds !== undefined, {
    message: "At least one field is required.",
    path: ["body"]
  });

export const duplicateTemplateRequestSchema = z.object({
  name: templateNameSchema.optional()
});

export const templateFromWorkoutRequestSchema = z.object({
  name: templateNameSchema
});

export const updateTemplateFromWorkoutRequestSchema = z.object({
  workoutId: z.string().uuid()
});

export type CreateTemplateRequest = z.infer<typeof createTemplateRequestSchema>;
export type UpdateTemplateRequest = z.infer<typeof updateTemplateRequestSchema>;
export type ListTemplatesQuery = z.infer<typeof listTemplatesQuerySchema>;

function queryArraySchema<T extends z.ZodTypeAny>(item: T): z.ZodEffects<z.ZodTypeAny, z.infer<T>[]> {
  return z.preprocess((value) => {
    if (value === undefined || value === "") return [];
    const values = Array.isArray(value) ? value : [value];
    return values.flatMap((entry) => typeof entry === "string" ? entry.split(",") : entry);
  }, z.array(item).max(20));
}
