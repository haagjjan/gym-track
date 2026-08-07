import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { sendValidationError } from "../../shared/http-validation.js";
import { authenticateRequest } from "../auth/authenticate-request.js";
import type { AuthService, PublicUser } from "../auth/auth.service.js";
import { adminAuditQuerySchema, adminUserParamsSchema, adminUserStatusSchema } from "./admin.schemas.js";
import type { AdminService } from "./admin.service.js";

interface AdminRouteOptions {
  authService: AuthService;
  cookieName: string;
  service: AdminService;
}

export async function registerAdminRoutes(server: FastifyInstance, options: AdminRouteOptions): Promise<void> {
  server.get("/api/v1/admin/users", async (request, reply) => {
    if (!await requireAdmin(request, reply, options)) return;
    return reply.send({ data: { items: await options.service.listUsers() } });
  });

  server.patch("/api/v1/admin/users/:userId/status", {
    config: { rateLimit: { max: 30, timeWindow: "1 hour" } }
  }, async (request, reply) => {
    const admin = await requireAdmin(request, reply, options);
    if (!admin) return;
    const params = adminUserParamsSchema.safeParse(request.params);
    const body = adminUserStatusSchema.safeParse(request.body);
    if (!params.success) return sendValidationError(reply, params.error, "userId");
    if (!body.success) return sendValidationError(reply, body.error);
    const result = await options.service.setUserStatus(admin.id, params.data.userId, body.data.status);
    return sendMutationResult(reply, result);
  });

  server.post("/api/v1/admin/users/:userId/sessions/revoke", {
    config: { rateLimit: { max: 30, timeWindow: "1 hour" } }
  }, async (request, reply) => {
    const admin = await requireAdmin(request, reply, options);
    if (!admin) return;
    const params = adminUserParamsSchema.safeParse(request.params);
    if (!params.success) return sendValidationError(reply, params.error, "userId");
    const result = await options.service.revokeUserSessions(admin.id, params.data.userId);
    return sendMutationResult(reply, result);
  });

  server.get("/api/v1/admin/audit-events", async (request, reply) => {
    if (!await requireAdmin(request, reply, options)) return;
    const query = adminAuditQuerySchema.safeParse(request.query);
    if (!query.success) return sendValidationError(reply, query.error, "query");
    return reply.send({ data: await options.service.listAuditEvents(query.data.cursor, query.data.limit) });
  });
}

async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
  options: Pick<AdminRouteOptions, "authService" | "cookieName">
): Promise<PublicUser | null> {
  const user = await authenticateRequest(request, reply, options);
  if (!user) return null;
  if (user.role === "ADMIN") return user;
  void reply.status(403).send({ error: { code: "FORBIDDEN", message: "Administrator access is required." } });
  return null;
}

function sendMutationResult(
  reply: FastifyReply,
  result:
    | { status: "updated"; revokedSessions: number; accountStatus?: AdminAccountStatus }
    | { status: "not_found" | "forbidden" | "invalid_transition" }
) {
  if (result.status === "updated") return reply.send({ data: result });
  if (result.status === "not_found") {
    return reply.status(404).send({ error: { code: "USER_NOT_FOUND", message: "The user was not found." } });
  }
  if (result.status === "forbidden") {
    return reply.status(403).send({ error: { code: "ADMIN_TARGET_FORBIDDEN", message: "Administrator accounts cannot be changed here." } });
  }
  return reply.status(409).send({ error: { code: "INVALID_ACCOUNT_TRANSITION", message: "This account status transition is unavailable." } });
}

type AdminAccountStatus = "ACTIVE" | "SUSPENDED";
