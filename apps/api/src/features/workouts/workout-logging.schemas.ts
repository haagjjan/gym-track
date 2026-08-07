import { z } from "zod";

const uuidSchema = z.string().uuid();
const optionalNoteSchema = z
  .union([
    z
      .string()
      .trim()
      .max(1_000)
      .transform((value) => (value.length > 0 ? value : null)),
    z.null()
  ])
  .optional();
const decimalStringSchema = z
  .union([z.string().trim(), z.number()])
  .transform((value) => String(value))
  .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), {
    message: "Expected a positive decimal with up to two decimal places."
  })
  .refine((value) => Number(value) > 0, {
    message: "Expected a positive value."
  });

export const workoutParamsSchema = z.object({
  workoutId: uuidSchema
});

export const sessionExerciseParamsSchema = z.object({
  workoutId: uuidSchema,
  sessionExerciseId: uuidSchema
});

export const setParamsSchema = z.object({
  setId: uuidSchema
});

export const addSessionExerciseRequestSchema = z.object({
  clientMutationId: uuidSchema,
  exerciseId: uuidSchema,
  position: z.number().int().positive().optional()
});

export const reorderSessionExercisesRequestSchema = z.object({
  items: z.array(
    z.object({
      sessionExerciseId: uuidSchema,
      position: z.number().int().positive()
    })
  )
});

const setValuesSchema = z.object({
  setType: z.enum(["warmup", "working"]),
  weightKg: decimalStringSchema,
  reps: z.number().int().positive(),
  rir: z.number().int().min(0).max(10),
  restTimeSeconds: z.number().int().nonnegative().nullable().optional(),
  note: optionalNoteSchema
});

export const addSetRequestSchema = setValuesSchema.extend({
  clientMutationId: uuidSchema
});

export const updateSetRequestSchema = setValuesSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  {
    message: "At least one field is required.",
    path: ["body"]
  }
);

export type AddSessionExerciseRequest = z.infer<typeof addSessionExerciseRequestSchema>;
export type ReorderSessionExercisesRequest = z.infer<typeof reorderSessionExercisesRequestSchema>;
export type AddSetRequest = z.infer<typeof addSetRequestSchema>;
export type UpdateSetRequest = z.infer<typeof updateSetRequestSchema>;
