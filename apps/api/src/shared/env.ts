import { z } from "zod";

const logLevelSchema = z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]);

const rawEnvSchema = z.object({
  API_HOST: z.string().min(1).default("0.0.0.0"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_TRUST_PROXY: z.enum(["true", "false"]).optional(),
  APP_BASE_URL: z.string().url().optional(),
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
  REGISTRATION_MODE: z.enum(["ENABLED", "DISABLED"]).optional(),
  RESEND_API_KEY: z.string().min(1).optional()
});

const envSchema = rawEnvSchema
  .superRefine((env, context) => {
    if (env.APP_BASE_URL) {
      const appBaseUrl = new URL(env.APP_BASE_URL);

      if (appBaseUrl.pathname !== "/" || appBaseUrl.search || appBaseUrl.hash) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "APP_BASE_URL must contain an origin without a path.",
          path: ["APP_BASE_URL"]
        });
      }
    }

    const isProductionDeployment =
      env.NODE_ENV === "production" && (env.APP_ENV ?? env.NODE_ENV) !== "local";

    if (!isProductionDeployment) {
      return;
    }

    if (!env.APP_BASE_URL) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "APP_BASE_URL is required in production.",
        path: ["APP_BASE_URL"]
      });
    } else if (new URL(env.APP_BASE_URL).protocol !== "https:") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "APP_BASE_URL must use HTTPS in production.",
        path: ["APP_BASE_URL"]
      });
    }

    if (env.AUTH_COOKIE_SECURE === "false") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "AUTH_COOKIE_SECURE cannot be false in production.",
        path: ["AUTH_COOKIE_SECURE"]
      });
    }
  })
  .transform((env) => ({
    ...env,
    API_TRUST_PROXY: env.API_TRUST_PROXY === "true",
    APP_BASE_URL: (env.APP_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, ""),
    APP_ENV: env.APP_ENV ?? env.NODE_ENV,
    AUTH_COOKIE_SECURE:
      env.AUTH_COOKIE_SECURE === undefined
        ? env.NODE_ENV === "production"
        : env.AUTH_COOKIE_SECURE === "true",
    METRICS_ENABLED: env.METRICS_ENABLED === "true",
    REGISTRATION_MODE:
      env.REGISTRATION_MODE ?? (env.NODE_ENV === "production" ? "DISABLED" : "ENABLED")
  }));

export type AppEnv = z.infer<typeof envSchema>;

export function readEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  return envSchema.parse(source);
}
