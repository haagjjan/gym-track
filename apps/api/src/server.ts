import cookie from "@fastify/cookie";
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
import { createWorkoutLoggingRepository } from "./features/workouts/workout-logging.repository.js";
import { registerWorkoutLoggingRoutes } from "./features/workouts/workout-logging.routes.js";
import { createWorkoutLoggingService } from "./features/workouts/workout-logging.service.js";
import { createWorkoutCsvRepository } from "./features/workouts/workout-csv.repository.js";
import { registerWorkoutCsvRoutes } from "./features/workouts/workout-csv.routes.js";
import { createWorkoutCsvService } from "./features/workouts/workout-csv.service.js";
import { createWorkoutRepository } from "./features/workouts/workout.repository.js";
import { registerWorkoutRoutes } from "./features/workouts/workout.routes.js";
import { createWorkoutService } from "./features/workouts/workout.service.js";
import type { ApiLogger } from "./shared/logger.js";

export interface ServerAuthConfig {
  cookieName: string;
  cookieSecure: boolean;
  sessionTtlDays: number;
}

export async function buildServer(
  db: Kysely<AppDatabase>,
  authConfig: ServerAuthConfig,
  logger: ApiLogger = false
): Promise<FastifyInstance> {
  const server = fastify({
    logger
  });
  const databaseHealth = createDatabaseHealthCheck(db);
  const authService = createAuthService({
    repository: createAuthRepository(db),
    passwordHasher: argon2PasswordHasher,
    sessionTokens: cryptoSessionTokenGenerator,
    sessionTtlDays: authConfig.sessionTtlDays
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
  const workoutCsvService = createWorkoutCsvService({
    repository: createWorkoutCsvRepository(db)
  });

  await server.register(cookie);
  await registerHealthRoutes(server, databaseHealth);
  await registerAuthRoutes(server, {
    service: authService,
    cookie: {
      name: authConfig.cookieName,
      secure: authConfig.cookieSecure,
      maxAgeSeconds: authConfig.sessionTtlDays * 24 * 60 * 60
    }
  });
  await registerWorkoutRoutes(server, {
    authService,
    cookieName: authConfig.cookieName,
    workoutService
  });
  await registerWorkoutLoggingRoutes(server, {
    authService,
    cookieName: authConfig.cookieName,
    loggingService: workoutLoggingService
  });
  await registerWorkoutCsvRoutes(server, {
    authService,
    cookieName: authConfig.cookieName,
    csvService: workoutCsvService
  });
  await registerExerciseRoutes(server, {
    authService,
    cookieName: authConfig.cookieName,
    exerciseService
  });
  await registerAnalyticsRoutes(server, {
    authService,
    cookieName: authConfig.cookieName,
    analyticsService
  });

  return server;
}
