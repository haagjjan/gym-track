import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { sendValidationError } from "../../shared/http-validation.js";
import { authenticateRequest } from "../auth/authenticate-request.js";
import type { AuthService } from "../auth/auth.service.js";
import {
  createTemplateRequestSchema,
  duplicateTemplateRequestSchema,
  listTemplatesQuerySchema,
  templateFromWorkoutRequestSchema,
  templateParamsSchema,
  updateTemplateFromWorkoutRequestSchema,
  updateTemplateRequestSchema,
  workoutTemplateParamsSchema
} from "./template.schemas.js";
import type { TemplateResult, TemplateService } from "./template.service.js";

interface TemplateRouteOptions {
  authService: AuthService;
  cookieName: string;
  templateService: TemplateService;
}

export async function registerTemplateRoutes(
  server: FastifyInstance,
  options: TemplateRouteOptions
): Promise<void> {
  server.get("/api/v1/workout-templates", async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);
    if (!user) return;
    const input = listTemplatesQuerySchema.safeParse(request.query);
    if (!input.success) return sendValidationError(reply, input.error);
    return reply.send({ data: { items: await options.templateService.listTemplates(user.id, input.data) } });
  });

  server.post("/api/v1/workout-templates", async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);
    if (!user) return;
    const input = createTemplateRequestSchema.safeParse(request.body);
    if (!input.success) return sendValidationError(reply, input.error);
    return sendResult(reply, await options.templateService.createTemplate(user.id, input.data), 201, "template");
  });

  server.get("/api/v1/workout-templates/:templateId", async (request, reply) => {
    const context = await templateContext(request, reply, options);
    if (!context) return;
    return sendResult(reply, await options.templateService.getTemplate(context.user.id, context.templateId), 200, "template");
  });

  server.patch("/api/v1/workout-templates/:templateId", async (request, reply) => {
    const context = await templateContext(request, reply, options);
    if (!context) return;
    const input = updateTemplateRequestSchema.safeParse(request.body);
    if (!input.success) return sendValidationError(reply, input.error);
    return sendResult(reply, await options.templateService.updateTemplate(context.user.id, context.templateId, input.data), 200, "template");
  });

  server.post("/api/v1/workout-templates/:templateId/duplicate", async (request, reply) => {
    const context = await templateContext(request, reply, options);
    if (!context) return;
    const input = duplicateTemplateRequestSchema.safeParse(request.body ?? {});
    if (!input.success) return sendValidationError(reply, input.error);
    return sendResult(reply, await options.templateService.duplicateTemplate(context.user.id, context.templateId, input.data.name), 201, "template");
  });

  server.post("/api/v1/workout-templates/:templateId/start", async (request, reply) => {
    const context = await templateContext(request, reply, options);
    if (!context) return;
    return sendResult(reply, await options.templateService.startWorkout(context.user.id, context.templateId), 201, "workout");
  });

  server.post("/api/v1/workout-templates/:templateId/from-workout", async (request, reply) => {
    const context = await templateContext(request, reply, options);
    if (!context) return;
    const input = updateTemplateFromWorkoutRequestSchema.safeParse(request.body);
    if (!input.success) return sendValidationError(reply, input.error);
    return sendResult(reply, await options.templateService.updateFromWorkout(context.user.id, context.templateId, input.data.workoutId), 200, "template");
  });

  server.delete("/api/v1/workout-templates/:templateId", async (request, reply) => {
    const context = await templateContext(request, reply, options);
    if (!context) return;
    return sendResult(reply, await options.templateService.deleteTemplate(context.user.id, context.templateId), 200, "result");
  });

  server.post("/api/v1/workouts/:workoutId/templates", async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);
    if (!user) return;
    const params = workoutTemplateParamsSchema.safeParse(request.params);
    const input = templateFromWorkoutRequestSchema.safeParse(request.body);
    if (!params.success) return sendValidationError(reply, params.error);
    if (!input.success) return sendValidationError(reply, input.error);
    return sendResult(reply, await options.templateService.createFromWorkout(user.id, params.data.workoutId, input.data.name), 201, "template");
  });
}

async function templateContext(request: FastifyRequest, reply: FastifyReply, options: TemplateRouteOptions) {
  const user = await authenticateRequest(request, reply, options);
  if (!user) return null;
  const params = templateParamsSchema.safeParse(request.params);
  if (!params.success) {
    sendValidationError(reply, params.error);
    return null;
  }
  return { user, templateId: params.data.templateId };
}

function sendResult<T>(reply: FastifyReply, result: TemplateResult<T>, status: number, key: string) {
  if (result.ok) return reply.status(status).send({ data: { [key]: result.value } });
  if (result.reason === "open_workout_exists") return reply.status(409).send({ error: { code: "OPEN_WORKOUT_EXISTS", message: "Resume or complete the active workout first." } });
  if (result.reason === "exercise_not_found") return reply.status(404).send({ error: { code: "EXERCISE_NOT_FOUND", message: "One or more exercises are not selectable." } });
  return reply.status(404).send({ error: { code: "TEMPLATE_NOT_FOUND", message: "Workout template was not found." } });
}
