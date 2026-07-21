import { z } from "zod";

export const updateUserPreferencesSchema = z.object({
  volumeHeatCeiling: z.number().int().min(5).max(50)
});

export type UpdateUserPreferences = z.infer<typeof updateUserPreferencesSchema>;
