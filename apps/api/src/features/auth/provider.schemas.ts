import { z } from "zod";
import { signupRequestSchema } from "./auth.schemas.js";

export const providerSchema = z.enum(["apple", "google"]);
export const providerRequestSchema = z.object({
  provider: providerSchema,
  idToken: z.string().min(1).max(32_768),
  nonce: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  signup: signupRequestSchema.pick({ termsVersion: true, privacyVersion: true, adultAttested: true }).optional()
});
export type ProviderRequest = z.infer<typeof providerRequestSchema>;
