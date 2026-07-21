import { z } from "zod";
import { EXERCISE_EQUIPMENT, EXERCISE_TYPES } from "./exercise-classifications.js";

const searchSchema = z
  .string()
  .trim()
  .max(100)
  .transform((value) => (value.length > 0 ? value : undefined));

export const listExercisesQuerySchema = z.object({
  search: searchSchema.optional(),
  muscleGroupId: z.string().uuid().optional(),
  muscleGroupIds: queryArraySchema(z.string().uuid()).optional(),
  primaryMuscleGroupId: z.string().uuid().optional(),
  equipment: z.enum([...EXERCISE_EQUIPMENT, "unspecified"]).optional(),
  exerciseType: z.enum([...EXERCISE_TYPES, "unspecified"]).optional(),
  ownership: z.enum(["editable", "readOnly"]).optional(),
  sort: z.enum(["name", "muscle", "equipment", "type"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

export const exerciseNameSuggestionsQuerySchema = z.object({
  name: z.string().trim().min(1).max(120)
});

const exerciseWriteSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    equipment: z.union([classificationSchema(EXERCISE_EQUIPMENT), z.null()]).optional(),
    exerciseType: z.union([classificationSchema(EXERCISE_TYPES), z.null()]).optional(),
    primaryMuscleGroupIds: z.array(z.string().uuid()).min(1).max(20).optional(),
    primaryMuscleGroupId: z.string().uuid().optional(),
    secondaryMuscleGroupIds: z.array(z.string().uuid()).max(20).default([]),
    confirmNameWarning: z.boolean().optional()
  })
  .superRefine((value, context) => {
    const primaryIds = value.primaryMuscleGroupIds ??
      (value.primaryMuscleGroupId ? [value.primaryMuscleGroupId] : []);

    if (primaryIds.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one primary muscle group is required.",
        path: ["primaryMuscleGroupIds"]
      });
    }

    validateUnique(primaryIds, "Primary muscle groups must be unique.", "primaryMuscleGroupIds", context);
    validateUnique(
      value.secondaryMuscleGroupIds,
      "Secondary muscle groups must be unique.",
      "secondaryMuscleGroupIds",
      context
    );

    if (value.secondaryMuscleGroupIds.some((id) => primaryIds.includes(id))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A muscle group cannot be both primary and secondary.",
        path: ["secondaryMuscleGroupIds"]
      });
    }
  })
  .transform(({ primaryMuscleGroupId, ...value }) => ({
    ...value,
    primaryMuscleGroupIds:
      value.primaryMuscleGroupIds ?? (primaryMuscleGroupId ? [primaryMuscleGroupId] : [])
  }));

export const createExerciseRequestSchema = exerciseWriteSchema;
export const updateExerciseRequestSchema = exerciseWriteSchema;

export const exerciseParamsSchema = z.object({
  exerciseId: z.string().uuid()
});

export const mergeExerciseRequestSchema = z.object({
  targetExerciseId: z.string().uuid()
});

export type ListExercisesQuery = z.infer<typeof listExercisesQuerySchema>;
export type CreateExerciseRequest = z.infer<typeof createExerciseRequestSchema>;
export type UpdateExerciseRequest = z.infer<typeof updateExerciseRequestSchema>;
export type MergeExerciseRequest = z.infer<typeof mergeExerciseRequestSchema>;

function queryArraySchema<T extends z.ZodTypeAny>(item: T): z.ZodEffects<z.ZodTypeAny, z.infer<T>[]> {
  return z.preprocess((value) => {
    if (value === undefined || value === "") return [];
    const values = Array.isArray(value) ? value : [value];
    return values.flatMap((entry) => typeof entry === "string" ? entry.split(",") : entry);
  }, z.array(item).max(20));
}

function classificationSchema(values: readonly string[]): z.ZodEffects<z.ZodString, string> {
  return z.string().trim().refine((value) => values.includes(value), {
    message: `Expected one of: ${values.join(", ")}.`
  });
}

function validateUnique(
  ids: string[],
  message: string,
  path: string,
  context: z.RefinementCtx
): void {
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, message, path: [path] });
  }
}
