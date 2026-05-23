import { z } from "zod";

const logLevelSchema = z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]);

const rawEnvSchema = z.object({
  API_HOST: z.string().min(1).default("0.0.0.0"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  AUTH_COOKIE_NAME: z.string().min(1).default("gym_progress_session"),
  AUTH_COOKIE_SECURE: z.enum(["true", "false"]).optional(),
  AUTH_SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  DATABASE_URL: z.string().url(),
  LOG_LEVEL: logLevelSchema.default("info"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development")
});

const envSchema = rawEnvSchema.transform((env) => ({
  ...env,
  AUTH_COOKIE_SECURE:
    env.AUTH_COOKIE_SECURE === undefined
      ? env.NODE_ENV === "production"
      : env.AUTH_COOKIE_SECURE === "true"
}));

export type AppEnv = z.infer<typeof envSchema>;

export function readEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  return envSchema.parse(source);
}
