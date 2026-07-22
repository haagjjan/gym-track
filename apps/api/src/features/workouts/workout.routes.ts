import type { FastifyInstance, FastifyReply } from "fastify";
import { noopEventTracker, type EventTracker } from "../../shared/events.js";
import { sendValidationError } from "../../shared/http-validation.js";
import { authenticateRequest } from "../auth/authenticate-request.js";
import type { AuthService } from "../auth/auth.service.js";
import {
  createWorkoutRequestSchema,
  endWorkoutRequestSchema,
  listWorkoutsQuerySchema,
  updateWorkoutRequestSchema,
  workoutParamsSchema
} from "./workout.schemas.js";
import type { WorkoutService } from "./workout.service.js";

interface WorkoutRouteOptions {
  authService: AuthService;
  cookieName: string;
  workoutService: WorkoutService;
  events?: EventTracker;
}

export async function registerWorkoutRoutes(
  server: FastifyInstance,
  options: WorkoutRouteOptions
): Promise<void> {
  const events = options.events ?? noopEventTracker;

  server.post("/api/v1/workouts", async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);

    if (!user) {
      return;
    }

    const parsed = createWorkoutRequestSchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    const result = await options.workoutService.createWorkout(user.id, parsed.data);

    if (!result.ok) {
      return sendWorkoutError(reply, result.reason);
    }

    events.track("workout_created", user.id);

    return reply.status(201).send({
      data: {
        workout: result.value
      }
    });
  });

  server.get("/api/v1/workouts", async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);

    if (!user) {
      return;
    }

    const parsed = listWorkoutsQuerySchema.safeParse(request.query);

    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    const result = await options.workoutService.listWorkouts(user.id, parsed.data);

    return reply.send({
      data: result
    });
  });

  server.get("/api/v1/workouts/:workoutId", async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);

    if (!user) {
      return;
    }

    const params = workoutParamsSchema.safeParse(request.params);

    if (!params.success) {
      return sendValidationError(reply, params.error);
    }

    const result = await options.workoutService.getWorkout(user.id, params.data.workoutId);

    if (!result.ok) {
      return sendWorkoutError(reply, result.reason);
    }

    return reply.send({
      data: {
        workout: result.value
      }
    });
  });

  server.post("/api/v1/workouts/:workoutId/end", async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);

    if (!user) {
      return;
    }

    const params = workoutParamsSchema.safeParse(request.params);

    if (!params.success) {
      return sendValidationError(reply, params.error);
    }

    const body = endWorkoutRequestSchema.safeParse(request.body ?? {});

    if (!body.success) {
      return sendValidationError(reply, body.error);
    }

    const result = await options.workoutService.endWorkout(
      user.id,
      params.data.workoutId,
      body.data
    );

    if (!result.ok) {
      return sendWorkoutError(reply, result.reason);
    }

    events.track("workout_completed", user.id, {
      exercises: result.value.exercises.length
    });

    return reply.send({
      data: {
        workout: result.value
      }
    });
  });

  server.patch("/api/v1/workouts/:workoutId", async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);

    if (!user) {
      return;
    }

    const params = workoutParamsSchema.safeParse(request.params);

    if (!params.success) {
      return sendValidationError(reply, params.error);
    }

    const body = updateWorkoutRequestSchema.safeParse(request.body ?? {});

    if (!body.success) {
      return sendValidationError(reply, body.error);
    }

    const result = await options.workoutService.updateWorkout(
      user.id,
      params.data.workoutId,
      body.data
    );

    if (!result.ok) {
      return sendWorkoutError(reply, result.reason);
    }

    events.track("workout_session_edited", user.id, {
      fields: Object.keys(body.data)
    });

    return reply.send({
      data: {
        workout: result.value
      }
    });
  });

  server.delete("/api/v1/workouts/:workoutId", async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);

    if (!user) {
      return;
    }

    const params = workoutParamsSchema.safeParse(request.params);

    if (!params.success) {
      return sendValidationError(reply, params.error);
    }

    const result = await options.workoutService.deleteWorkout(user.id, params.data.workoutId);

    if (!result.ok) {
      return sendWorkoutError(reply, result.reason);
    }

    events.track(result.value.wasOpen ? "workout_discarded" : "workout_deleted", user.id);

    return reply.status(204).send();
  });
}

function sendWorkoutError(
  reply: FastifyReply,
  reason:
    | "already_closed"
    | "ended_before_started"
    | "not_found"
    | "open_workout_exists"
    | "workout_still_open"
) {
  if (reason === "workout_still_open") {
    return reply.status(409).send({
      error: {
        code: "WORKOUT_STILL_OPEN",
        message: "The end time can only be edited after the workout is completed."
      }
    });
  }

  if (reason === "open_workout_exists") {
    return reply.status(409).send({
      error: {
        code: "OPEN_WORKOUT_EXISTS",
        message: "An open workout already exists."
      }
    });
  }

  if (reason === "already_closed") {
    return reply.status(409).send({
      error: {
        code: "WORKOUT_ALREADY_CLOSED",
        message: "Workout is already closed."
      }
    });
  }

  if (reason === "ended_before_started") {
    return reply.status(422).send({
      error: {
        code: "VALIDATION_ERROR",
        message: "One or more fields are invalid.",
        fields: {
          endedAt: ["endedAt must be after startedAt."]
        }
      }
    });
  }

  return reply.status(404).send({
    error: {
      code: "WORKOUT_NOT_FOUND",
      message: "Workout was not found."
    }
  });
}
