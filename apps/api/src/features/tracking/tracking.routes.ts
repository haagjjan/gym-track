import type { FastifyInstance, FastifyReply } from "fastify";
import { sendValidationError } from "../../shared/http-validation.js";
import { authenticateRequest } from "../auth/authenticate-request.js";
import type { AuthService } from "../auth/auth.service.js";
import type { TrackingRepository, TrackingKind } from "./tracking.repository.js";
import { cardioCreateSchema, cardioUpdateSchema, revisionSchema, timedCreateSchema, timedUpdateSchema, trackingParamsSchema } from "./tracking.schemas.js";

interface Options { authService: AuthService; cookieName: string; repository: TrackingRepository }

export async function registerTrackingRoutes(server: FastifyInstance, options: Options): Promise<void> {
  server.get("/api/v1/tracking/catalog", async (request, reply) => {
    if (!(await authenticateRequest(request, reply, options))) return;
    return { data: { items: await options.repository.catalog() } };
  });
  server.get("/api/v1/tracking/progress", async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);
    if (!user) return;
    return { data: await options.repository.progress(user.id) };
  });
  server.get("/api/v1/tracking/workouts/:workoutId", async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);
    if (!user) return;
    const params = trackingParamsSchema.safeParse(request.params);
    if (!params.success) return sendValidationError(reply, params.error);
    const value = await options.repository.workout(user.id, params.data.workoutId);
    return value ? { data: value } : trackingError(reply, "not_found");
  });
  registerEntryRoutes(server, options, "timed_sets");
  registerEntryRoutes(server, options, "cardio_entries");
}

function registerEntryRoutes(server: FastifyInstance, options: Options, kind: TrackingKind): void {
  const path = `/api/v1/tracking/workouts/:workoutId/${kind === "timed_sets" ? "timed-sets" : "cardio"}`;
  server.post(path, async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);
    if (!user) return;
    const params = trackingParamsSchema.safeParse(request.params);
    const body = (kind === "timed_sets" ? timedCreateSchema : cardioCreateSchema).safeParse(request.body);
    if (!params.success) return sendValidationError(reply, params.error);
    if (!body.success) return sendValidationError(reply, body.error);
    const result = "exerciseId" in body.data
      ? await options.repository.createTimed(user.id, params.data.workoutId, body.data.id, body.data)
      : await options.repository.createCardio(user.id, params.data.workoutId, body.data.id, body.data);
    if (!result.ok) return trackingError(reply, result.reason);
    return reply.status(result.replayed ? 200 : 201).send({ data: { entry: result.value, replayed: result.replayed } });
  });
  server.patch(`${path}/:id`, async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);
    if (!user) return;
    const params = trackingParamsSchema.safeParse(request.params);
    const body = (kind === "timed_sets" ? timedUpdateSchema : cardioUpdateSchema).safeParse(request.body);
    if (!params.success) return sendValidationError(reply, params.error);
    if (!body.success) return sendValidationError(reply, body.error);
    const result = "exerciseId" in body.data
      ? await options.repository.updateTimed(user.id, params.data.workoutId, params.data.id!, body.data.revision, body.data)
      : await options.repository.updateCardio(user.id, params.data.workoutId, params.data.id!, body.data.revision, body.data);
    return result.ok ? { data: { entry: result.value } } : trackingError(reply, result.reason);
  });
  server.delete(`${path}/:id`, async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);
    if (!user) return;
    const params = trackingParamsSchema.safeParse(request.params);
    const query = revisionSchema.safeParse(request.query);
    if (!params.success) return sendValidationError(reply, params.error);
    if (!query.success) return sendValidationError(reply, query.error);
    const result = await options.repository.remove(kind, user.id, params.data.workoutId, params.data.id!, query.data.revision);
    return result.ok ? { data: { entry: result.value } } : trackingError(reply, result.reason);
  });
}
function trackingError(reply: FastifyReply, reason: "not_found" | "conflict") {
  return reply.status(reason === "conflict" ? 409 : 404).send({ error: {
    code: reason === "conflict" ? "TRACKING_CONFLICT" : "TRACKING_RESOURCE_NOT_FOUND",
    message: reason === "conflict" ? "This entry changed. Refresh it before saving again." : "The workout or entry was not found."
  } });
}
