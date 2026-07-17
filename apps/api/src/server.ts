import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import fastify, { type FastifyInstance } from "fastify";
import type { Kysely } from "kysely";
import { createAnalyticsRepository } from "./features/analytics/analytics.repository.js";
import { registerAnalyticsRoutes } from "./features/analytics/analytics.routes.js";
import { createAnalyticsService } from "./features/analytics/analytics.service.js";
import { createAuthRepository } from "./features/auth/auth.repository.js";
import { registerAuthRoutes } from "./features/auth/auth.routes.js";
import { createAuthService } from "./features/auth/auth.service.js";
import { argon2PasswordHasher } from "./features/auth/password.js";
import { cryptoSessionTokenGenerator } from "./features/auth/session-token.js";
import { createDatabaseHealthCheck } from "./db/database-health.js";
import type { AppDatabase } from "./db/database.js";
import { createExerciseRepository } from "./features/exercises/exercise.repository.js";
import { registerExerciseRoutes } from "./features/exercises/exercise.routes.js";
import { createExerciseService } from "./features/exercises/exercise.service.js";
import { registerHealthRoutes } from "./features/health/health.routes.js";
import { createTemplateRepository } from "./features/templates/template.repository.js";
import { registerTemplateRoutes } from "./features/templates/template.routes.js";
import { createTemplateService } from "./features/templates/template.service.js";
import { createWorkoutLoggingRepository } from "./features/workouts/workout-logging.repository.js";
import { registerWorkoutLoggingRoutes } from "./features/workouts/workout-logging.routes.js";
import { createWorkoutLoggingService } from "./features/workouts/workout-logging.service.js";
import { createWorkoutCsvRepository } from "./features/workouts/workout-csv.repository.js";
import { registerWorkoutCsvRoutes } from "./features/workouts/workout-csv.routes.js";
import { createWorkoutCsvService } from "./features/workouts/workout-csv.service.js";
import { createWorkoutRepository } from "./features/workouts/workout.repository.js";
import { registerWorkoutRoutes } from "./features/workouts/workout.routes.js";
import { createWorkoutService } from "./features/workouts/workout.service.js";
import { createUserPreferencesRepository } from "./features/users/user-preferences.repository.js";
import { registerUserPreferencesRoutes } from "./features/users/user-preferences.routes.js";
import { createUserPreferencesService } from "./features/users/user-preferences.service.js";
import { createEventTracker, noopEventTracker, type EventTracker } from "./shared/events.js";
import { createMailerFromEnv, type Mailer } from "./shared/mailer.js";
import type { ApiLogger } from "./shared/logger.js";
import { registerApiMetrics, type ApiMetricsOptions } from "./shared/metrics.js";

export interface ServerAuthConfig {
  cookieName: string;
  cookieSecure: boolean;
  sessionTtlDays: number;
}

export interface ServerExtras {
  /** Email transport for verification/reset mail. Defaults to a no-op sender. */
  mailer?: Mailer;
  /** Alternative to `mailer`: build the transport from env using the server logger. */
  mailerEnv?: {
    RESEND_API_KEY: string | undefined;
    EMAIL_FROM: string;
    NODE_ENV: "development" | "test" | "production";
  };
  /** Public web origin used in emailed action links. */
  appBaseUrl?: string;
  /** First-party analytics. Defaults to tracking into app_events. */
  events?: EventTracker | "off";
  /** Behind a reverse proxy, trust X-Forwarded-For so rate limits see real IPs. */
  trustProxy?: boolean;
  /** Internal Prometheus endpoint and bounded API request instrumentation. */
  metrics?: ApiMetricsOptions;
}

// One JSON payload should never need more than this; CSV imports are the
// largest legitimate bodies and stay under it too (decompression-bomb guard).
const BODY_LIMIT_BYTES = 1 * 1024 * 1024;

const AUTH_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

export async function buildServer(
  db: Kysely<AppDatabase>,
  authConfig: ServerAuthConfig,
  logger: ApiLogger = false,
  extras: ServerExtras = {}
): Promise<FastifyInstance> {
  const server = fastify({
    logger,
    bodyLimit: BODY_LIMIT_BYTES,
    trustProxy: extras.trustProxy ?? false
  });
  registerApiMetrics(server, extras.metrics);
  const events =
    extras.events === "off"
      ? noopEventTracker
      : extras.events ?? createEventTracker(db, server.log);
  const mailer =
    extras.mailer ??
    (extras.mailerEnv ? createMailerFromEnv(extras.mailerEnv, server.log) : undefined);
  const databaseHealth = createDatabaseHealthCheck(db);
  const authService = createAuthService({
    repository: createAuthRepository(db),
    passwordHasher: argon2PasswordHasher,
    sessionTokens: cryptoSessionTokenGenerator,
    sessionTtlDays: authConfig.sessionTtlDays,
    ...(mailer ? { mailer } : {}),
    ...(extras.appBaseUrl ? { appBaseUrl: extras.appBaseUrl } : {}),
    logger: server.log
  });
  const workoutService = createWorkoutService({
    repository: createWorkoutRepository(db)
  });
  const workoutLoggingService = createWorkoutLoggingService({
    repository: createWorkoutLoggingRepository(db)
  });
  const exerciseService = createExerciseService({
    repository: createExerciseRepository(db)
  });
  const analyticsService = createAnalyticsService({
    repository: createAnalyticsRepository(db)
  });
  const templateService = createTemplateService({
    repository: createTemplateRepository(db)
  });
  const workoutCsvService = createWorkoutCsvService({
    repository: createWorkoutCsvRepository(db)
  });
  const userPreferencesService = createUserPreferencesService({
    repository: createUserPreferencesRepository(db)
  });

  // JSON API: strict security headers, no CSP needed (nothing is rendered).
  await server.register(helmet, {
    contentSecurityPolicy: false
  });
  // Baseline abuse ceiling per client IP; auth routes carry stricter
  // per-route limits (see auth.routes.ts).
  await server.register(rateLimit, {
    max: 300,
    timeWindow: "1 minute",
    // Match the API's error envelope so clients render a real message.
    errorResponseBuilder: (_request, context) => ({
      error: {
        code: "RATE_LIMITED",
        message: `Too many requests. Try again in ${context.after}.`
      }
    })
  });
  await server.register(cookie);
  await registerHealthRoutes(server, databaseHealth);
  await registerAuthRoutes(server, {
    service: authService,
    events,
    cookie: {
      name: authConfig.cookieName,
      secure: authConfig.cookieSecure,
      maxAgeSeconds: authConfig.sessionTtlDays * 24 * 60 * 60
    }
  });
  await registerWorkoutRoutes(server, {
    authService,
    cookieName: authConfig.cookieName,
    workoutService,
    events
  });
  await registerWorkoutLoggingRoutes(server, {
    authService,
    cookieName: authConfig.cookieName,
    loggingService: workoutLoggingService,
    events
  });
  await registerWorkoutCsvRoutes(server, {
    authService,
    cookieName: authConfig.cookieName,
    csvService: workoutCsvService,
    events
  });
  await registerExerciseRoutes(server, {
    authService,
    cookieName: authConfig.cookieName,
    exerciseService,
    events
  });
  await registerAnalyticsRoutes(server, {
    authService,
    cookieName: authConfig.cookieName,
    analyticsService
  });
  await registerTemplateRoutes(server, {
    authService,
    cookieName: authConfig.cookieName,
    templateService
  });
  await registerUserPreferencesRoutes(server, {
    authService,
    cookieName: authConfig.cookieName,
    service: userPreferencesService
  });

  // Daily hygiene: purge long-expired sessions and action tokens.
  const cleanupTimer = setInterval(() => {
    authService.cleanupExpiredAuthRecords().catch((error: unknown) => {
      server.log.warn({ error }, "auth record cleanup failed");
    });
  }, AUTH_CLEANUP_INTERVAL_MS);

  cleanupTimer.unref();
  server.addHook("onClose", async () => {
    clearInterval(cleanupTimer);
  });

  return server;
}
