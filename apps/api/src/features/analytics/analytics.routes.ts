import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { ZodError } from "zod";
import type { AuthService, PublicUser } from "../auth/auth.service.js";
import {
  analyticsExerciseParamsSchema,
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
  server.get("/api/v1/analytics/exercises/:exerciseId/progress", async (request, reply) => {
    const user = await authenticate(request, reply, options);

    if (!user) {
      return;
    }

    const params = analyticsExerciseParamsSchema.safeParse(request.params);
    const query = exerciseProgressQuerySchema.safeParse(request.query);

    if (!params.success) {
      return sendValidationError(reply, params.error);
    }

    if (!query.success) {
      return sendValidationError(reply, query.error);
    }

    const result = await options.analyticsService.getExerciseProgress(
      user.id,
      params.data.exerciseId,
      query.data
    );

    return reply.send({ data: result });
  });

  server.get("/api/v1/analytics/exercises/:exerciseId/summary", async (request, reply) => {
    const user = await authenticate(request, reply, options);

    if (!user) {
      return;
    }

    const params = analyticsExerciseParamsSchema.safeParse(request.params);
    const query = exerciseSummaryQuerySchema.safeParse(request.query);

    if (!params.success) {
      return sendValidationError(reply, params.error);
    }

    if (!query.success) {
      return sendValidationError(reply, query.error);
    }

    const result = await options.analyticsService.getExerciseSummary(
      user.id,
      params.data.exerciseId,
      query.data
    );

    return reply.send({ data: result });
  });

  server.get("/api/v1/analytics/weekly-volume", async (request, reply) => {
    const user = await authenticate(request, reply, options);

    if (!user) {
      return;
    }

    const query = weeklyVolumeQuerySchema.safeParse(request.query);

    if (!query.success) {
      return sendValidationError(reply, query.error);
    }

    const result = await options.analyticsService.getWeeklyVolume(user.id, query.data);

    return reply.send({ data: result });
  });
}

async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
  options: AnalyticsRouteOptions
): Promise<PublicUser | null> {
  const result = await options.authService.currentUser(request.cookies[options.cookieName]);

  if (!result.ok) {
    void reply.status(401).send({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication is required."
      }
    });

    return null;
  }

  return result.value;
}

function sendValidationError(reply: FastifyReply, error: ZodError) {
  return reply.status(422).send({
    error: {
      code: "VALIDATION_ERROR",
      message: "One or more fields are invalid.",
      fields: toFieldErrors(error)
    }
  });
}

function toFieldErrors(error: ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "query");
    fields[key] = [...(fields[key] ?? []), issue.message];
  }

  return fields;
}
