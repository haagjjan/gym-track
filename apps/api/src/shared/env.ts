import { z } from "zod";

const logLevelSchema = z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]);
const senderSchema = z.string().trim().min(3).refine((value) => {
  const bracketedAddress = value.match(/<([^<>]+)>\s*$/)?.[1];
  return z.string().email().safeParse(bracketedAddress ?? value).success;
}, "Expected an email address or a display name followed by an email address.");
const emailRecipientAllowlistSchema = z.string().transform((value, context) => {
  const recipients = [...new Set(value.split(",").map((recipient) => recipient.trim().toLowerCase()).filter(Boolean))];
  for (const recipient of recipients) {
    if (!z.string().email().safeParse(recipient).success) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "EMAIL_RECIPIENT_ALLOWLIST must contain only comma-separated email addresses."
      });
      return z.NEVER;
    }
  }
  return recipients;
});
const optionalEnvironmentValue = <Schema extends z.ZodTypeAny>(schema: Schema) =>
  z.preprocess((value) => value === "" ? undefined : value, schema.optional());

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
  BFF_CLIENT_IP_SECRET: optionalEnvironmentValue(z.string().min(32)),
  DATABASE_URL: z.string().url(),
  EMAIL_FROM: optionalEnvironmentValue(senderSchema),
  EMAIL_RECIPIENT_ALLOWLIST: optionalEnvironmentValue(emailRecipientAllowlistSchema),
  LOG_LEVEL: logLevelSchema.default("info"),
  METRICS_ENABLED: z.enum(["true", "false"]).optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  REGISTRATION_MODE: z.enum(["ENABLED", "INVITE_ONLY", "DISABLED"]).optional(),
  RESEND_API_KEY: optionalEnvironmentValue(z.string().min(1)),
  SUPPORT_EMAIL: optionalEnvironmentValue(z.string().email()),
  TELEGRAM_BETA_BOT_TOKEN: optionalEnvironmentValue(z.string().min(1)),
  TELEGRAM_BETA_CHAT_ID: optionalEnvironmentValue(z.string().min(1))
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

    const deploymentEnvironment = env.APP_ENV ?? env.NODE_ENV;
    const isProductionDeployment = env.NODE_ENV === "production"
      && deploymentEnvironment !== "local"
      && deploymentEnvironment !== "private-lan";

    if (deploymentEnvironment === "staging" && !env.EMAIL_RECIPIENT_ALLOWLIST?.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "EMAIL_RECIPIENT_ALLOWLIST is required in staging.",
        path: ["EMAIL_RECIPIENT_ALLOWLIST"]
      });
    }

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

    if (env.AUTH_COOKIE_SECURE !== "true") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "AUTH_COOKIE_SECURE must be explicitly set to true in production.",
        path: ["AUTH_COOKIE_SECURE"]
      });
    }
    if (!env.BFF_CLIENT_IP_SECRET) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "BFF_CLIENT_IP_SECRET is required in production.",
        path: ["BFF_CLIENT_IP_SECRET"]
      });
    }
    if (!env.SUPPORT_EMAIL) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "SUPPORT_EMAIL is required in production.",
        path: ["SUPPORT_EMAIL"]
      });
    }
    if (!env.EMAIL_FROM) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "EMAIL_FROM is required in production.",
        path: ["EMAIL_FROM"]
      });
    }
    if (!env.RESEND_API_KEY) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "RESEND_API_KEY is required in production.",
        path: ["RESEND_API_KEY"]
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
    EMAIL_FROM: env.EMAIL_FROM ?? "Gym Progress Tracker <onboarding@resend.dev>",
    METRICS_ENABLED: env.METRICS_ENABLED === "true",
    REGISTRATION_MODE:
      env.REGISTRATION_MODE ?? (env.NODE_ENV === "production" ? "DISABLED" : "ENABLED")
  }));

export type AppEnv = z.infer<typeof envSchema>;

export function readEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  return envSchema.parse(source);
}
