import { z } from "zod";

const emailSchema = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const usernameSchema = z.string().trim().min(1).max(50);
const passwordSchema = z.string().min(4).max(200);

export const signupRequestSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema
});

export const loginRequestSchema = z.object({
  username: usernameSchema,
  password: passwordSchema
});

export type SignupRequest = z.infer<typeof signupRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
