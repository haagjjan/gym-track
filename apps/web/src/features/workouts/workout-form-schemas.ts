import { z } from "zod";

const optionalNumberSchema = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? Number(value) : null));

export const setFormSchema = z.object({
  setType: z.enum(["warmup", "working"]),
  weightKg: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Use kg with up to two decimals.")
    .refine((value) => Number(value) > 0, "Weight must be positive."),
  reps: z.coerce.number().int().positive("Reps must be positive."),
  rir: z.coerce.number().int().min(0, "RIR must be 0-10.").max(10, "RIR must be 0-10."),
  restTimeSeconds: optionalNumberSchema.refine(
    (value) => value === null || (Number.isInteger(value) && value >= 0),
    "Rest must be a non-negative whole number."
  ),
  note: z
    .string()
    .trim()
    .max(1_000)
    .transform((value) => (value.length > 0 ? value : null))
});

export const createExerciseFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  equipment: z
    .string()
    .trim()
    .max(120)
    .transform((value) => (value.length > 0 ? value : null)),
  exerciseType: z
    .string()
    .trim()
    .max(50)
    .transform((value) => (value.length > 0 ? value : null)),
  primaryMuscleGroupId: z.string().uuid("Choose a muscle group.")
});

export type SetFormInput = z.infer<typeof setFormSchema>;
export type CreateExerciseFormInput = z.infer<typeof createExerciseFormSchema>;
