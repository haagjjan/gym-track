import { z } from "zod";

const isoInstantSchema = z.string().trim().datetime({ offset: true });
const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
const uuidSchema = z.string().uuid();

const dateRangeShape = {
  startDate: queryDateSchema("start").optional(),
  endDate: queryDateSchema("end").optional()
};

export const analyticsExerciseParamsSchema = z.object({
  exerciseId: uuidSchema
});

export const completedExercisesQuerySchema = z.object({
  timeZone: z.string().trim().max(100).default("UTC").refine(isValidTimeZone, "Invalid IANA time zone.")
});

export const exerciseProgressQuerySchema = withDateRangeRefinement(
  z.object({
    ...dateRangeShape,
    includeWarmups: z
      .enum(["false", "true"])
      .default("false")
      .transform((value) => value === "true")
  })
);

export const exerciseSummaryQuerySchema = withDateRangeRefinement(z.object(dateRangeShape));

export const weeklyVolumeQuerySchema = withDateRangeRefinement(
  z.object({
    ...dateRangeShape,
    muscleGroupIds: z
      .string()
      .trim()
      .optional()
      .transform((value) => {
        if (!value) {
          return undefined;
        }

        return value.split(",").map((id) => id.trim());
      })
      .refine(
        (ids) =>
          ids === undefined ||
          (ids.length > 0 &&
            ids.every((id) => uuidSchema.safeParse(id).success) &&
            new Set(ids).size === ids.length),
        "Expected comma-separated unique UUIDs."
      )
  })
);

export type ExerciseProgressQuery = z.infer<typeof exerciseProgressQuerySchema>;
export type ExerciseSummaryQuery = z.infer<typeof exerciseSummaryQuerySchema>;
export type CompletedExercisesQuery = z.infer<typeof completedExercisesQuerySchema>;
export type WeeklyVolumeQuery = z.infer<typeof weeklyVolumeQuerySchema>;

function withDateRangeRefinement<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return schema.refine((value) => !value.startDate || !value.endDate || value.endDate >= value.startDate, {
    message: "endDate must be after startDate.",
    path: ["endDate"]
  });
}

function queryDateSchema(bound: "end" | "start") {
  return z
    .string()
    .trim()
    .refine((value) => isValidDateOnly(value) || isoInstantSchema.safeParse(value).success, {
      message: "Expected an ISO date or timestamp."
    })
    .transform((value) => parseQueryDate(value, bound));
}

function parseQueryDate(value: string, bound: "end" | "start"): Date {
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

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}
