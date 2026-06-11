import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { ZodError } from "zod";
import type { AuthService, PublicUser } from "../auth/auth.service.js";
import {
  createExerciseRequestSchema,
  listExercisesQuerySchema
} from "./exercise.schemas.js";
import type { ExerciseService } from "./exercise.service.js";
import type { ExerciseNameEvaluation } from "./exercise-name-quality.js";

interface ExerciseRouteOptions {
  authService: AuthService;
  cookieName: string;
  exerciseService: ExerciseService;
}

export async function registerExerciseRoutes(
  server: FastifyInstance,
  options: ExerciseRouteOptions
): Promise<void> {
  server.get("/api/v1/muscle-groups", async (request, reply) => {
    const user = await authenticate(request, reply, options);

    if (!user) {
      return;
    }

    const result = await options.exerciseService.listMuscleGroups();

    return reply.send({
      data: result
    });
  });

  server.get("/api/v1/exercises", async (request, reply) => {
    const user = await authenticate(request, reply, options);

    if (!user) {
      return;
    }

    const parsed = listExercisesQuerySchema.safeParse(request.query);

    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    const result = await options.exerciseService.listExercises(parsed.data);

    return reply.send({
      data: result
    });
  });

  server.post("/api/v1/exercises", async (request, reply) => {
    const user = await authenticate(request, reply, options);

    if (!user) {
      return;
    }

    const parsed = createExerciseRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    const result = await options.exerciseService.createExercise(user.id, parsed.data);

    if (!result.ok) {
      return sendExerciseError(
        reply,
        result.reason,
        "evaluation" in result ? result.evaluation : undefined
      );
    }

    return reply.status(201).send({
      data: {
        exercise: result.value
      }
    });
  });
}

async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
  options: ExerciseRouteOptions
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

function sendExerciseError(
  reply: FastifyReply,
  reason: "muscle_group_not_found" | "name_conflict" | "name_review_required" | "name_blocked",
  evaluation?: ExerciseNameEvaluation
) {
  if (reason === "name_conflict") {
    return reply.status(409).send({
      error: {
        code: "EXERCISE_NAME_CONFLICT",
        message: "An active exercise with this name already exists."
      }
    });
  }

  if (reason === "name_review_required") {
    return reply.status(422).send({
      error: {
        code: "EXERCISE_NAME_REVIEW_REQUIRED",
        message: "This exercise name needs review before it can be added.",
        details: toExerciseNameDetails(evaluation)
      }
    });
  }

  if (reason === "name_blocked") {
    return reply.status(422).send({
      error: {
        code: "EXERCISE_NAME_BLOCKED",
        message: "This exercise name is blocked.",
        details: toExerciseNameDetails(evaluation)
      }
    });
  }

  return reply.status(404).send({
    error: {
      code: "MUSCLE_GROUP_NOT_FOUND",
      message: "One or more muscle groups were not found."
    }
  });
}

function toExerciseNameDetails(evaluation?: ExerciseNameEvaluation) {
  return {
    normalizedName: evaluation?.normalizedName ?? "",
    reasons: evaluation?.reasons ?? [],
    suggestions: evaluation?.suggestions ?? []
  };
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
