import { z } from "zod";

const usernameSchema = z.string().trim().min(1, "Username is required.").max(50);
const passwordSchema = z
  .string()
  .min(4, "Password must be at least 4 characters.")
  .max(200, "Password is too long.");

export const signupFormSchema = z.object({
  email: z.string().trim().email("Enter a valid email.").max(254),
  username: usernameSchema,
  password: passwordSchema
});

export const loginFormSchema = z.object({
  username: usernameSchema,
  password: passwordSchema
});

export type SignupFormInput = z.infer<typeof signupFormSchema>;
export type LoginFormInput = z.infer<typeof loginFormSchema>;
