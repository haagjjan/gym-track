import { z } from "zod";

const envSchema = z.object({
  API_HOST: z.string().min(1).default("0.0.0.0"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  AUTH_COOKIE_NAME: z.string().min(1).default("gym_progress_session"),
  AUTH_COOKIE_SECURE: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  AUTH_SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  DATABASE_URL: z.string().url()
});

export type AppEnv = z.infer<typeof envSchema>;

export function readEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  return envSchema.parse(source);
}
