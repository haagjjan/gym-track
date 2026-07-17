import type { FastifyInstance } from "fastify";
import { sendValidationError } from "../../shared/http-validation.js";
import { authenticateRequest } from "../auth/authenticate-request.js";
import type { AuthService } from "../auth/auth.service.js";
import {
  analyticsExerciseParamsSchema,
  completedExercisesQuerySchema,
  exerciseProgressQuerySchema,
  exerciseSummaryQuerySchema,
  weeklyVolumeQuerySchema
} from "./analytics.schemas.js";
import type { AnalyticsService } from "./analytics.service.js";

interface AnalyticsRouteOptions {
  analyticsService: AnalyticsService;
  authService: AuthService;
  cookieName: string;
}

export async function registerAnalyticsRoutes(
  server: FastifyInstance,
  options: AnalyticsRouteOptions
): Promise<void> {
  server.get("/api/v1/analytics/exercises", async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);

    if (!user) {
      return;
    }

    const query = completedExercisesQuerySchema.safeParse(request.query);
    if (!query.success) return sendValidationError(reply, query.error, "query");
    const result = await options.analyticsService.listCompletedExercises(user.id, query.data);

    return reply.send({ data: result });
  });

  server.get("/api/v1/analytics/exercises/:exerciseId/progress", async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);

    if (!user) {
      return;
    }

    const params = analyticsExerciseParamsSchema.safeParse(request.params);
    const query = exerciseProgressQuerySchema.safeParse(request.query);

    if (!params.success) {
      return sendValidationError(reply, params.error, "query");
    }

    if (!query.success) {
      return sendValidationError(reply, query.error, "query");
    }

    const result = await options.analyticsService.getExerciseProgress(
      user.id,
      params.data.exerciseId,
      query.data
    );

    return reply.send({ data: result });
  });

  server.get("/api/v1/analytics/exercises/:exerciseId/summary", async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);

    if (!user) {
      return;
    }

    const params = analyticsExerciseParamsSchema.safeParse(request.params);
    const query = exerciseSummaryQuerySchema.safeParse(request.query);

    if (!params.success) {
      return sendValidationError(reply, params.error, "query");
    }

    if (!query.success) {
      return sendValidationError(reply, query.error, "query");
    }

    const result = await options.analyticsService.getExerciseSummary(
      user.id,
      params.data.exerciseId,
      query.data
    );

    return reply.send({ data: result });
  });

  server.get("/api/v1/analytics/weekly-volume", async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);

    if (!user) {
      return;
    }

    const query = weeklyVolumeQuerySchema.safeParse(request.query);

    if (!query.success) {
      return sendValidationError(reply, query.error, "query");
    }

    const result = await options.analyticsService.getWeeklyVolume(user.id, query.data);

    return reply.send({ data: result });
  });
}
