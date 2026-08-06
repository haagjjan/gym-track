import { z } from "zod";

const httpsUrl = z.string().url().max(500).refine((value) => new URL(value).protocol === "https:", "Use an HTTPS URL.");
const responseType = z.enum(["ACKNOWLEDGEMENT", "RATING", "SINGLE_CHOICE", "FREE_TEXT"]);

export const createCampaignSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(2_000),
  audienceType: z.enum(["ALL", "SELECTED"]),
  targetUserIds: z.array(z.string().uuid()).max(50).default([]),
  triggerType: z.enum(["NEXT_LOGIN", "NTH_LOGIN", "NTH_WORKOUT", "AFTER_WORKOUT", "SCHEDULED"]),
  triggerThreshold: z.number().int().positive().max(10_000).nullable().default(null),
  responseType,
  responseOptions: z.array(z.string().trim().min(1).max(80)).max(6).default([]),
  actionUrl: httpsUrl.nullable().default(null),
  essential: z.boolean().default(false),
  startsAt: z.coerce.date().nullable().default(null),
  endsAt: z.coerce.date().nullable().default(null),
  scheduledAt: z.coerce.date().nullable().default(null)
}).superRefine((value, context) => {
  if (value.audienceType === "SELECTED" && value.targetUserIds.length === 0) context.addIssue({ code: z.ZodIssueCode.custom, path: ["targetUserIds"], message: "Select at least one user." });
  if ((value.triggerType === "NTH_LOGIN" || value.triggerType === "NTH_WORKOUT") && value.triggerThreshold === null) context.addIssue({ code: z.ZodIssueCode.custom, path: ["triggerThreshold"], message: "A trigger threshold is required." });
  if (value.triggerType === "SCHEDULED" && value.scheduledAt === null) context.addIssue({ code: z.ZodIssueCode.custom, path: ["scheduledAt"], message: "A schedule is required." });
  if (value.responseType === "SINGLE_CHOICE" && value.responseOptions.length < 2) context.addIssue({ code: z.ZodIssueCode.custom, path: ["responseOptions"], message: "Provide at least two choices." });
  if (value.endsAt && value.startsAt && value.endsAt <= value.startsAt) context.addIssue({ code: z.ZodIssueCode.custom, path: ["endsAt"], message: "End must follow start." });
});

export const campaignActionSchema = z.object({ action: z.enum(["PUBLISH", "PAUSE", "RESUME", "END"]) });
export const messageResponseSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ACKNOWLEDGEMENT"), acknowledged: z.literal(true) }),
  z.object({ type: z.literal("RATING"), rating: z.number().int().min(1).max(5) }),
  z.object({ type: z.literal("SINGLE_CHOICE"), choice: z.string().trim().min(1).max(80) }),
  z.object({ type: z.literal("FREE_TEXT"), text: z.string().trim().min(1).max(1_000) })
]);

export type CreateCampaign = z.infer<typeof createCampaignSchema>;
export type MessageResponse = z.infer<typeof messageResponseSchema>;
