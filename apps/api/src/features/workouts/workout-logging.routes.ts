import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { ZodError } from "zod";
import type { AuthService, PublicUser } from "../auth/auth.service.js";
import {
  addSessionExerciseRequestSchema,
  addSetRequestSchema,
  reorderSessionExercisesRequestSchema,
  sessionExerciseParamsSchema,
  setParamsSchema,
  updateSetRequestSchema,
  workoutParamsSchema
} from "./workout-logging.schemas.js";
import type { WorkoutLoggingService } from "./workout-logging.service.js";

interface WorkoutLoggingRouteOptions {
  authService: AuthService;
  cookieName: string;
  loggingService: WorkoutLoggingService;
}

export async function registerWorkoutLoggingRoutes(
  server: FastifyInstance,
  options: WorkoutLoggingRouteOptions
): Promise<void> {
  server.post("/api/v1/workouts/:workoutId/exercises", async (request, reply) => {
    const user = await authenticate(request, reply, options);

    if (!user) {
      return;
    }

    const params = workoutParamsSchema.safeParse(request.params);
    const body = addSessionExerciseRequestSchema.safeParse(request.body);

    if (!params.success) {
      return sendValidationError(reply, params.error);
    }

    if (!body.success) {
      return sendValidationError(reply, body.error);
    }

    const result = await options.loggingService.addSessionExercise(
      user.id,
      params.data.workoutId,
      body.data
    );

    if (!result.ok) {
      return sendLoggingError(reply, result.reason);
    }

    return reply.status(201).send({ data: { sessionExercise: result.value } });
  });

  server.patch("/api/v1/workouts/:workoutId/exercises/reorder", async (request, reply) => {
    const user = await authenticate(request, reply, options);

    if (!user) {
      return;
    }

    const params = workoutParamsSchema.safeParse(request.params);
    const body = reorderSessionExercisesRequestSchema.safeParse(request.body);

    if (!params.success) {
      return sendValidationError(reply, params.error);
    }

    if (!body.success) {
      return sendValidationError(reply, body.error);
    }

    const result = await options.loggingService.reorderSessionExercises(
      user.id,
      params.data.workoutId,
      body.data
    );

    if (!result.ok) {
      return sendLoggingError(reply, result.reason);
    }

    return reply.send({ data: { items: result.value } });
  });

  server.delete(
    "/api/v1/workouts/:workoutId/exercises/:sessionExerciseId",
    async (request, reply) => {
      const user = await authenticate(request, reply, options);

      if (!user) {
        return;
      }

      const params = sessionExerciseParamsSchema.safeParse(request.params);

      if (!params.success) {
        return sendValidationError(reply, params.error);
      }

      const result = await options.loggingService.deleteSessionExercise(
        user.id,
        params.data.workoutId,
        params.data.sessionExerciseId
      );

      if (!result.ok) {
        return sendLoggingError(reply, result.reason);
      }

      return reply.send({ data: result.value });
    }
  );

  server.post(
    "/api/v1/workouts/:workoutId/exercises/:sessionExerciseId/sets",
    async (request, reply) => {
      const user = await authenticate(request, reply, options);

      if (!user) {
        return;
      }

      const params = sessionExerciseParamsSchema.safeParse(request.params);
      const body = addSetRequestSchema.safeParse(request.body);

      if (!params.success) {
        return sendValidationError(reply, params.error);
      }

      if (!body.success) {
        return sendValidationError(reply, body.error);
      }

      const result = await options.loggingService.addSet(
        user.id,
        params.data.workoutId,
        params.data.sessionExerciseId,
        body.data
      );

      if (!result.ok) {
        return sendLoggingError(reply, result.reason);
      }

      return reply.status(201).send({ data: { set: result.value } });
    }
  );

  server.patch("/api/v1/sets/:setId", async (request, reply) => {
    const user = await authenticate(request, reply, options);

    if (!user) {
      return;
    }

    const params = setParamsSchema.safeParse(request.params);
    const body = updateSetRequestSchema.safeParse(request.body);

    if (!params.success) {
      return sendValidationError(reply, params.error);
    }

    if (!body.success) {
      return sendValidationError(reply, body.error);
    }

    const result = await options.loggingService.updateSet(user.id, params.data.setId, body.data);

    if (!result.ok) {
      return sendLoggingError(reply, result.reason);
    }

    return reply.send({ data: { set: result.value } });
  });

  server.delete("/api/v1/sets/:setId", async (request, reply) => {
    const user = await authenticate(request, reply, options);

    if (!user) {
      return;
    }

    const params = setParamsSchema.safeParse(request.params);

    if (!params.success) {
      return sendValidationError(reply, params.error);
    }

    const result = await options.loggingService.deleteSet(user.id, params.data.setId);

    if (!result.ok) {
      return sendLoggingError(reply, result.reason);
    }

    return reply.send({ data: result.value });
  });
}

async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
  options: WorkoutLoggingRouteOptions
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

function sendLoggingError(reply: FastifyReply, reason: "invalid_order" | "not_found") {
  if (reason === "invalid_order") {
    return reply.status(409).send({
      error: {
        code: "INVALID_WORKOUT_ORDER",
        message: "Workout item ordering is invalid."
      }
    });
  }

  return reply.status(404).send({
    error: {
      code: "WORKOUT_LOGGING_RESOURCE_NOT_FOUND",
      message: "Workout logging resource was not found."
    }
  });
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
    const key = String(issue.path[0] ?? "body");
    fields[key] = [...(fields[key] ?? []), issue.message];
  }

  return fields;
}
