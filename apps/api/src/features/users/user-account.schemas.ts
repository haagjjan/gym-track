import { z } from "zod";

export const reauthenticateSchema = z.object({
  password: z.string().min(1).max(200)
});

export const cancelDeletionSchema = z.object({
  token: z.string().trim().min(20).max(200)
});

export const privacyPreferencesSchema = z.object({
  functionalStorageEnabled: z.boolean().optional(),
  analyticsEnabled: z.boolean().optional(),
  feedbackPromptsEnabled: z.boolean().optional()
}).refine((value) => Object.keys(value).length > 0, "At least one preference is required.");

export const onboardingSchema = z.object({
  version: z.number().int().min(1).max(100),
  steps: z.record(z.string().max(60), z.boolean()).refine(
    (steps) => Object.keys(steps).length <= 20,
    "At most 20 onboarding steps are supported."
  )
});

export type PrivacyPreferencesUpdate = z.infer<typeof privacyPreferencesSchema>;
export type OnboardingUpdate = z.infer<typeof onboardingSchema>;
