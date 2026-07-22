import { z } from "zod";
import {
  EXERCISE_EQUIPMENT,
  EXERCISE_TYPES
} from "../exercises/exercise-classifications.js";

const isoInstantSchema = z.string().trim().datetime({ offset: true });
const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

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

const instantRequestSchema = isoInstantSchema.transform((value) => new Date(value));
const startQueryDateSchema = queryDateSchema("start");
const endQueryDateSchema = queryDateSchema("end");

export const createWorkoutRequestSchema = z.object({
  startedAt: instantRequestSchema.optional(),
  workoutType: optionalTextSchema(50),
  title: optionalTextSchema(120),
  notes: optionalTextSchema(2_000)
});

export const listWorkoutsQuerySchema = z
  .object({
    startDate: startQueryDateSchema.optional(),
    endDate: endQueryDateSchema.optional(),
    search: z.string().trim().max(120).transform((value) => value || undefined).optional(),
    muscleGroupIds: queryArraySchema(z.string().uuid()).optional(),
    equipment: z.enum([...EXERCISE_EQUIPMENT, "unspecified"]).optional(),
    exerciseType: z.enum([...EXERCISE_TYPES, "unspecified"]).optional(),
    sort: z.enum(["newest", "oldest", "name"]).optional(),
    timeZone: z.string().trim().max(100).refine(isValidTimeZone, "Invalid IANA time zone.").optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0)
  })
  .refine((value) => !value.startDate || !value.endDate || value.endDate >= value.startDate, {
    message: "endDate must be after startDate.",
    path: ["endDate"]
  });

export const workoutParamsSchema = z.object({
  workoutId: z.string().uuid()
});

export const endWorkoutRequestSchema = z.object({
  endedAt: instantRequestSchema.optional()
});

export const updateWorkoutRequestSchema = z
  .object({
    startedAt: instantRequestSchema.optional(),
    endedAt: instantRequestSchema.optional(),
    title: optionalTextSchema(120)
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
    path: ["body"]
  });

export type CreateWorkoutRequest = z.infer<typeof createWorkoutRequestSchema>;
export type ListWorkoutsQuery = z.infer<typeof listWorkoutsQuerySchema>;
export type EndWorkoutRequest = z.infer<typeof endWorkoutRequestSchema>;
export type UpdateWorkoutRequest = z.infer<typeof updateWorkoutRequestSchema>;

function queryDateSchema(bound: "start" | "end") {
  return z
    .string()
    .trim()
    .refine((value) => isValidDateOnly(value) || isoInstantSchema.safeParse(value).success, {
      message: "Expected an ISO date or timestamp."
    })
    .transform((value) => parseQueryDate(value, bound));
}

function parseQueryDate(value: string, bound: "start" | "end"): Date {
  if (!dateOnlyPattern.test(value)) {
    return new Date(value);
  }

  if (bound === "start") {
    return new Date(`${value}T00:00:00.000Z`);
  }

  return new Date(`${value}T23:59:59.999Z`);
}

function isValidDateOnly(value: string): boolean {
  if (!dateOnlyPattern.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

function queryArraySchema<T extends z.ZodTypeAny>(item: T): z.ZodEffects<z.ZodTypeAny, z.infer<T>[]> {
  return z.preprocess((value) => {
    if (value === undefined || value === "") return [];
    const values = Array.isArray(value) ? value : [value];
    return values.flatMap((entry) => typeof entry === "string" ? entry.split(",") : entry);
  }, z.array(item).max(20));
}

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}
