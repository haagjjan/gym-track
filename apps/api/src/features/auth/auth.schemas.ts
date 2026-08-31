import { z } from "zod";

const emailSchema = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const usernameSchema = z.string().trim().min(1).max(50);
// New accounts and resets require a real passphrase; login stays permissive so
// accounts created under the old 4-character minimum can still sign in.
const newPasswordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(200);
const loginPasswordSchema = z.string().min(1).max(200);
// Sign-in accepts either the username or the account email, so the identifier
// is bounded by the wider of the two (email) rather than the username limit.
const loginIdentifierSchema = z.string().trim().min(1).max(254);
const actionTokenSchema = z.string().trim().min(20).max(200);
const policyVersionSchema = z.string().trim().min(1).max(50);

export const signupRequestSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  password: newPasswordSchema,
  inviteToken: actionTokenSchema.optional(),
  termsVersion: policyVersionSchema.optional(),
  privacyVersion: policyVersionSchema.optional(),
  adultAttested: z.literal(true).optional()
});

export const loginRequestSchema = z.object({
  username: loginIdentifierSchema,
  password: loginPasswordSchema
});

export const verifyEmailRequestSchema = z.object({
  token: actionTokenSchema
});

export const forgotPasswordRequestSchema = z.object({
  email: emailSchema
});

export const resetPasswordRequestSchema = z.object({
  token: actionTokenSchema,
  password: newPasswordSchema
});

export type SignupRequest = z.infer<typeof signupRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type VerifyEmailRequest = z.infer<typeof verifyEmailRequestSchema>;
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;
