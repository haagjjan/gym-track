import { z } from "zod";

const optionalTextSchema = (maxLength: number) =>
  z
    .union([
      z
        .string()
        .trim()
        .max(maxLength)
        .transform((value) => (value.length > 0 ? value : null)),
      z.null()
    ])
    .optional();

const searchSchema = z
  .string()
  .trim()
  .max(100)
  .transform((value) => (value.length > 0 ? value : undefined));

export const listExercisesQuerySchema = z.object({
  search: searchSchema.optional(),
  primaryMuscleGroupId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

export const createExerciseRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    equipment: optionalTextSchema(120),
    exerciseType: optionalTextSchema(50),
    primaryMuscleGroupId: z.string().uuid(),
    secondaryMuscleGroupIds: z.array(z.string().uuid()).max(20).default([])
  })
  .refine((value) => new Set(value.secondaryMuscleGroupIds).size === value.secondaryMuscleGroupIds.length, {
    message: "Secondary muscle groups must be unique.",
    path: ["secondaryMuscleGroupIds"]
  });

export type ListExercisesQuery = z.infer<typeof listExercisesQuerySchema>;
export type CreateExerciseRequest = z.infer<typeof createExerciseRequestSchema>;
