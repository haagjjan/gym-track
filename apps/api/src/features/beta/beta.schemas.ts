import { z } from "zod";

export const PUBLIC_PRIVACY_VERSION = "2026-08-10-beta-1";
export const PUBLIC_TERMS_VERSION = "2026-08-10-beta-1";

export const waitlistRequestSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  adultAttested: z.literal(true),
  termsVersion: z.literal(PUBLIC_TERMS_VERSION),
  privacyVersion: z.literal(PUBLIC_PRIVACY_VERSION)
});

export const betaSettingsSchema = z.object({
  waitlistOpen: z.boolean().optional(),
  invitationsOpen: z.boolean().optional(),
  campaignsOpen: z.boolean().optional(),
  accountCap: z.number().int().min(1).max(10_000).optional(),
  dailyApprovalLimit: z.number().int().min(1).max(1_000).optional()
}).refine((value) => Object.keys(value).length > 0, "At least one setting is required.");

export const betaRequestActionSchema = z.object({
  action: z.enum(["APPROVE", "RESEND", "RETURN_TO_WAITLIST", "BLOCK"])
});

export type WaitlistRequest = z.infer<typeof waitlistRequestSchema>;
export type BetaSettingsUpdate = z.infer<typeof betaSettingsSchema>;
