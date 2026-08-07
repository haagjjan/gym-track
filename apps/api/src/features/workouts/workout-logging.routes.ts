import type { FastifyInstance, FastifyReply } from "fastify";
import { noopEventTracker, type EventTracker } from "../../shared/events.js";
import { sendValidationError } from "../../shared/http-validation.js";
import { authenticateRequest } from "../auth/authenticate-request.js";
import type { AuthService } from "../auth/auth.service.js";
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
  events?: EventTracker;
}

export async function registerWorkoutLoggingRoutes(
  server: FastifyInstance,
  options: WorkoutLoggingRouteOptions
): Promise<void> {
  const events = options.events ?? noopEventTracker;

  server.post("/api/v1/workouts/:workoutId/exercises", async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);

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

    return reply
      .status(result.replayed ? 200 : 201)
      .send({ data: { sessionExercise: result.value, replayed: result.replayed } });
  });

  server.patch("/api/v1/workouts/:workoutId/exercises/reorder", async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);

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
      const user = await authenticateRequest(request, reply, options);

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
      const user = await authenticateRequest(request, reply, options);

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

      if (!result.replayed) {
        events.track("set_logged", user.id, { setType: body.data.setType });
      }

      return reply
        .status(result.replayed ? 200 : 201)
        .send({ data: { set: result.value, replayed: result.replayed } });
    }
  );

  server.patch("/api/v1/sets/:setId", async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);

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
    const user = await authenticateRequest(request, reply, options);

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

function sendLoggingError(
  reply: FastifyReply,
  reason: "idempotency_conflict" | "invalid_order" | "not_found"
) {
  if (reason === "idempotency_conflict") {
    return reply.status(409).send({
      error: {
        code: "IDEMPOTENCY_CONFLICT",
        message: "This mutation ID was already used for different workout data."
      }
    });
  }

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
