import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { sendValidationError } from "../../shared/http-validation.js";
import { authenticateRequest } from "../auth/authenticate-request.js";
import type { AuthService, PublicUser } from "../auth/auth.service.js";
import { campaignActionSchema, createCampaignSchema, messageResponseSchema } from "./message.schemas.js";
import type { MessageRepository } from "./message.repository.js";

export async function registerMessageRoutes(server: FastifyInstance, options: {
  authService: AuthService; cookieName: string; repository: MessageRepository;
}): Promise<void> {
  server.get("/api/v1/messages", async (request, reply) => {
    const user = await authenticateRequest(request, reply, options); if (!user) return;
    if ((request.query as { inbox?: string }).inbox === "true") {
      return reply.send({ data: { items: await options.repository.listInboxMessages(user.id) } });
    }
    const items = await options.repository.listEligibleMessages(user.id, new Date());
    if (items[0]) await options.repository.markShown(user.id, items[0].id, new Date());
    return reply.send({ data: { items } });
  });
  server.post("/api/v1/messages/:campaignId/dismiss", { config: { rateLimit: { max: 30, timeWindow: "1 hour" } } }, async (request, reply) => {
    const user = await authenticateRequest(request, reply, options); if (!user) return;
    const campaignId = (request.params as { campaignId: string }).campaignId;
    return await options.repository.dismiss(user.id, campaignId, new Date())
      ? reply.send({ data: { dismissed: true } })
      : reply.status(404).send({ error: { code: "MESSAGE_NOT_FOUND", message: "Message was not found." } });
  });
  server.post("/api/v1/messages/:campaignId/respond", { config: { rateLimit: { max: 10, timeWindow: "1 hour" } } }, async (request, reply) => {
    const user = await authenticateRequest(request, reply, options); if (!user) return;
    const input = messageResponseSchema.safeParse(request.body); if (!input.success) return sendValidationError(reply, input.error);
    const campaignId = (request.params as { campaignId: string }).campaignId;
    return await options.repository.respond(user.id, campaignId, input.data, new Date())
      ? reply.send({ data: { responded: true } })
      : reply.status(409).send({ error: { code: "MESSAGE_RESPONSE_REJECTED", message: "This response was not accepted." } });
  });
  server.get("/api/v1/admin/campaigns", async (request, reply) => {
    if (!await requireAdmin(request, reply, options)) return;
    return reply.send({ data: { items: await options.repository.listCampaigns() } });
  });
  server.post("/api/v1/admin/campaigns", { config: { rateLimit: { max: 30, timeWindow: "1 hour" } } }, async (request, reply) => {
    const user = await requireAdmin(request, reply, options); if (!user) return;
    const input = createCampaignSchema.safeParse(request.body); if (!input.success) return sendValidationError(reply, input.error);
    return reply.status(201).send({ data: { campaign: await options.repository.createCampaign(user.id, input.data, new Date()) } });
  });
  server.post("/api/v1/admin/campaigns/:campaignId/action", { config: { rateLimit: { max: 30, timeWindow: "1 hour" } } }, async (request, reply) => {
    const user = await requireAdmin(request, reply, options); if (!user) return;
    const input = campaignActionSchema.safeParse(request.body); if (!input.success) return sendValidationError(reply, input.error);
    const campaignId = (request.params as { campaignId: string }).campaignId;
    return await options.repository.setCampaignStatus(user.id, campaignId, input.data.action, new Date())
      ? reply.send({ data: { updated: true } })
      : reply.status(409).send({ error: { code: "INVALID_CAMPAIGN_STATE", message: "Campaign action is unavailable." } });
  });
}

async function requireAdmin(request: FastifyRequest, reply: FastifyReply, options: { authService: AuthService; cookieName: string }): Promise<PublicUser | null> {
  const user = await authenticateRequest(request, reply, options); if (!user) return null;
  if (user.role === "ADMIN") return user;
  void reply.status(403).send({ error: { code: "FORBIDDEN", message: "Administrator access is required." } }); return null;
}
