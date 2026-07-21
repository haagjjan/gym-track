import type { FastifyInstance, FastifyReply } from "fastify";
import { noopEventTracker, type EventTracker } from "../../shared/events.js";
import { sendValidationError } from "../../shared/http-validation.js";
import { authenticateRequest } from "../auth/authenticate-request.js";
import type { AuthService } from "../auth/auth.service.js";
import {
  createExerciseRequestSchema,
  exerciseNameSuggestionsQuerySchema,
  exerciseParamsSchema,
  listExercisesQuerySchema,
  mergeExerciseRequestSchema,
  updateExerciseRequestSchema
} from "./exercise.schemas.js";
import type { ExerciseService } from "./exercise.service.js";
import type { ExerciseNameEvaluation } from "./exercise-name-quality.js";

interface ExerciseRouteOptions {
  authService: AuthService;
  cookieName: string;
  exerciseService: ExerciseService;
  events?: EventTracker;
}

export async function registerExerciseRoutes(
  server: FastifyInstance,
  options: ExerciseRouteOptions
): Promise<void> {
  const events = options.events ?? noopEventTracker;
  server.get("/api/v1/muscle-groups", async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);

    if (!user) {
      return;
    }

    const result = await options.exerciseService.listMuscleGroups();

    return reply.send({
      data: result
    });
  });

  server.get("/api/v1/exercises", async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);

    if (!user) {
      return;
    }

    const parsed = listExercisesQuerySchema.safeParse(request.query);

    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    const result = await options.exerciseService.listExercises(user.id, parsed.data);

    return reply.send({
      data: result
    });
  });

  server.get("/api/v1/exercises/options", async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);
    if (!user) return;
    return reply.send({ data: await options.exerciseService.listOptions() });
  });

  server.get("/api/v1/exercises/name-suggestions", async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);
    if (!user) return;
    const parsed = exerciseNameSuggestionsQuerySchema.safeParse(request.query);
    if (!parsed.success) return sendValidationError(reply, parsed.error);
    const items = await options.exerciseService.findNameSuggestions(parsed.data.name);
    return reply.send({ data: { items } });
  });

  server.post("/api/v1/exercises", async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);

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

  server.patch("/api/v1/exercises/:exerciseId", async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);

    if (!user) {
      return;
    }

    const params = exerciseParamsSchema.safeParse(request.params);
    const body = updateExerciseRequestSchema.safeParse(request.body);

    if (!params.success) {
      return sendValidationError(reply, params.error);
    }

    if (!body.success) {
      return sendValidationError(reply, body.error);
    }

    const result = await options.exerciseService.updateExercise(
      user.id,
      params.data.exerciseId,
      body.data
    );

    if (!result.ok) {
      return sendExerciseError(
        reply,
        result.reason,
        "evaluation" in result ? result.evaluation : undefined
      );
    }

    return reply.send({ data: { exercise: result.value } });
  });

  server.post("/api/v1/exercises/:exerciseId/merge", async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);

    if (!user) {
      return;
    }

    const params = exerciseParamsSchema.safeParse(request.params);

    if (!params.success) {
      return sendValidationError(reply, params.error);
    }

    const body = mergeExerciseRequestSchema.safeParse(request.body);

    if (!body.success) {
      return sendValidationError(reply, body.error);
    }

    const result = await options.exerciseService.mergeExercises(
      user.id,
      params.data.exerciseId,
      body.data
    );

    if (!result.ok) {
      return sendExerciseError(reply, result.reason);
    }

    events.track("exercise_merged", user.id, {
      sourceExerciseId: result.value.source.id,
      targetExerciseId: result.value.target.id,
      affectedSets: result.value.affectedSets,
      sourceRetired: result.value.source.retired
    });

    return reply.send({
      data: {
        merge: result.value
      }
    });
  });
}

function sendExerciseError(
  reply: FastifyReply,
  reason:
    | "muscle_group_not_found"
    | "name_conflict"
    | "name_review_required"
    | "name_blocked"
    | "exercise_not_found"
    | "exercise_forbidden"
    | "merge_same_exercise",
  evaluation?: ExerciseNameEvaluation
) {
  if (reason === "exercise_forbidden") {
    return reply.status(403).send({
      error: {
        code: "EXERCISE_FORBIDDEN",
        message: "Only the user who created this exercise may edit it."
      }
    });
  }

  if (reason === "exercise_not_found") {
    return reply.status(404).send({
      error: {
        code: "EXERCISE_NOT_FOUND",
        message: "One or both exercises were not found."
      }
    });
  }

  if (reason === "merge_same_exercise") {
    return reply.status(422).send({
      error: {
        code: "VALIDATION_ERROR",
        message: "One or more fields are invalid.",
        fields: {
          targetExerciseId: ["An exercise cannot be merged into itself."]
        }
      }
    });
  }

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
