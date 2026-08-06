import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { sendValidationError } from "../../shared/http-validation.js";
import { authenticateRequest } from "../auth/authenticate-request.js";
import type { AuthService, PublicUser } from "../auth/auth.service.js";
import { betaRequestActionSchema, betaSettingsSchema, waitlistRequestSchema } from "./beta.schemas.js";
import type { BetaService } from "./beta.service.js";

export async function registerBetaRoutes(server: FastifyInstance, options: {
  authService: AuthService;
  betaService: BetaService;
  cookieName: string;
}): Promise<void> {
  server.post("/api/v1/beta/waitlist", {
    config: { rateLimit: { max: 5, timeWindow: "1 hour" } }
  }, async (request, reply) => {
    const input = waitlistRequestSchema.safeParse(request.body);
    if (!input.success) return sendValidationError(reply, input.error);
    return reply.status(202).send({ data: await options.betaService.requestAccess(input.data) });
  });

  server.get("/api/v1/admin/beta/requests", async (request, reply) => {
    if (!await requireAdmin(request, reply, options)) return;
    return reply.send({ data: { items: await options.betaService.listRequests() } });
  });

  server.get("/api/v1/admin/beta/settings", async (request, reply) => {
    if (!await requireAdmin(request, reply, options)) return;
    return reply.send({ data: { settings: await options.betaService.getSettings() } });
  });
  server.get("/api/v1/admin/beta/users", async (request, reply) => {
    if (!await requireAdmin(request, reply, options)) return;
    return reply.send({ data: { items: await options.betaService.listUsers() } });
  });

  server.patch("/api/v1/admin/beta/settings", { config: { rateLimit: { max: 30, timeWindow: "1 hour" } } }, async (request, reply) => {
    const user = await requireAdmin(request, reply, options);
    if (!user) return;
    const input = betaSettingsSchema.safeParse(request.body);
    if (!input.success) return sendValidationError(reply, input.error);
    return reply.send({ data: { settings: await options.betaService.updateSettings(user.id, input.data) } });
  });

  server.post("/api/v1/admin/beta/requests/:requestId", { config: { rateLimit: { max: 30, timeWindow: "1 hour" } } }, async (request, reply) => {
    const user = await requireAdmin(request, reply, options);
    if (!user) return;
    const input = betaRequestActionSchema.safeParse(request.body);
    if (!input.success) return sendValidationError(reply, input.error);
    const requestId = (request.params as { requestId: string }).requestId;
    const result = input.data.action === "APPROVE"
      ? await options.betaService.approve(requestId, user.id)
      : input.data.action === "RESEND"
        ? await options.betaService.resend(requestId, user.id)
        : input.data.action === "BLOCK"
          ? await options.betaService.block(requestId, user.id)
          : await options.betaService.returnToWaitlist(requestId, user.id);
    if (result === false || (typeof result === "object" && "status" in result && result.status !== "approved")) {
      const status = typeof result === "object" && "status" in result ? result.status : "not_found";
      return reply.status(status === "cap_reached" || status === "daily_limit_reached" ? 409 : 404)
        .send({ error: { code: status.toUpperCase(), message: "The beta access action could not be completed." } });
    }
    return reply.send({ data: { updated: true, ...(typeof result === "object" ? result : {}) } });
  });
}

async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
  options: { authService: AuthService; cookieName: string }
): Promise<PublicUser | null> {
  const user = await authenticateRequest(request, reply, options);
  if (!user) return null;
  if (user.role === "ADMIN") return user;
  void reply.status(403).send({ error: { code: "FORBIDDEN", message: "Administrator access is required." } });
  return null;
}
