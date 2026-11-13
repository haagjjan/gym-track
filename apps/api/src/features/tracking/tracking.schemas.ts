import { z } from "zod";

const uuid = z.string().uuid().transform((value) => value.toLowerCase());

const decimal = (positive: boolean, maximum = 9999.99) => z.union([z.string().trim(), z.number()]).transform(String)
  .refine((value) => /^\d+(\.\d{1,2})?$/.test(value) && Number(value) >= (positive ? 0.01 : 0) && Number(value) <= maximum,
    "Use a valid metric amount with up to two decimal places.")
  .transform((value) => Number(value).toFixed(2));
const note = z.string().trim().max(1000).nullable().optional().transform((value) => value || null);
const duration = z.number().int().min(1).max(86400);
export const trackingParamsSchema = z.object({ workoutId: uuid, id: uuid.optional() });
export const timedValuesSchema = z.object({
  exerciseId: uuid,
  durationSeconds: duration,
  setType: z.enum(["warmup", "working"]).default("working"),
  addedWeightKg: decimal(false).nullable().optional().transform((value) => value ?? null),
  note
});
export const cardioValuesSchema = z.object({
  activity: z.string().trim().min(1).max(100),
  durationSeconds: duration,
  distanceMetres: decimal(true, 1000000).nullable().optional().transform((value) => value ?? null),
  averageHeartRate: z.number().int().min(20).max(300).nullable().optional().transform((value) => value ?? null),
  note
});
export const timedCreateSchema = timedValuesSchema.extend({ id: uuid }).strict();
export const cardioCreateSchema = cardioValuesSchema.extend({ id: uuid }).strict();
export const timedUpdateSchema = timedValuesSchema.extend({ revision: z.number().int().positive() }).strict();
export const cardioUpdateSchema = cardioValuesSchema.extend({ revision: z.number().int().positive() }).strict();
export const revisionSchema = z.object({ revision: z.coerce.number().int().positive() }).strict();
export type TimedValues = z.infer<typeof timedValuesSchema>;
export type CardioValues = z.infer<typeof cardioValuesSchema>;
