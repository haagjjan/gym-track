import { z } from "zod";

const logLevelSchema = z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]);

const rawEnvSchema = z.object({
  API_HOST: z.string().min(1).default("0.0.0.0"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_TRUST_PROXY: z.enum(["true", "false"]).optional(),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  APP_ENV: z.string().trim().min(1).max(64).optional(),
  APP_RELEASE: z.string().trim().min(1).max(128).default("unknown"),
  AUTH_COOKIE_NAME: z.string().min(1).default("gym_progress_session"),
  AUTH_COOKIE_SECURE: z.enum(["true", "false"]).optional(),
  AUTH_SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  DATABASE_URL: z.string().url(),
  EMAIL_FROM: z.string().min(3).default("Gym Progress Tracker <onboarding@resend.dev>"),
  LOG_LEVEL: logLevelSchema.default("info"),
  METRICS_ENABLED: z.enum(["true", "false"]).optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  RESEND_API_KEY: z.string().min(1).optional()
});

const envSchema = rawEnvSchema.transform((env) => ({
  ...env,
  APP_ENV: env.APP_ENV ?? env.NODE_ENV,
  AUTH_COOKIE_SECURE:
    env.AUTH_COOKIE_SECURE === undefined
      ? env.NODE_ENV === "production"
      : env.AUTH_COOKIE_SECURE === "true",
  API_TRUST_PROXY:
    env.API_TRUST_PROXY === undefined
      ? env.NODE_ENV === "production"
      : env.API_TRUST_PROXY === "true",
  METRICS_ENABLED: env.METRICS_ENABLED === "true"
}));

export type AppEnv = z.infer<typeof envSchema>;

export function readEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  return envSchema.parse(source);
}
