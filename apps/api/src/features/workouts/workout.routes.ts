import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { ZodError } from "zod";
import type { AuthService, PublicUser } from "../auth/auth.service.js";
import {
  createWorkoutRequestSchema,
  endWorkoutRequestSchema,
  listWorkoutsQuerySchema,
  workoutParamsSchema
} from "./workout.schemas.js";
import type { WorkoutService } from "./workout.service.js";

interface WorkoutRouteOptions {
  authService: AuthService;
  cookieName: string;
  workoutService: WorkoutService;
}

export async function registerWorkoutRoutes(
  server: FastifyInstance,
  options: WorkoutRouteOptions
): Promise<void> {
  server.post("/api/v1/workouts", async (request, reply) => {
    const user = await authenticate(request, reply, options);

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

    return reply.status(201).send({
      data: {
        workout: result.value
      }
    });
  });

  server.get("/api/v1/workouts", async (request, reply) => {
    const user = await authenticate(request, reply, options);

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
    const user = await authenticate(request, reply, options);

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
    const user = await authenticate(request, reply, options);

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

    return reply.send({
      data: {
        workout: result.value
      }
    });
  });
}

async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
  options: WorkoutRouteOptions
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

function sendWorkoutError(
  reply: FastifyReply,
  reason: "already_closed" | "ended_before_started" | "not_found" | "open_workout_exists"
) {
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
