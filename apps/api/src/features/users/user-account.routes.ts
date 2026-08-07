import type { FastifyInstance } from "fastify";
import { sendValidationError } from "../../shared/http-validation.js";
import { authenticateRequest } from "../auth/authenticate-request.js";
import type { AuthService } from "../auth/auth.service.js";
import { cancelDeletionSchema, onboardingSchema, privacyPreferencesSchema, reauthenticateSchema } from "./user-account.schemas.js";
import { AccountEmailDeliveryError, type UserAccountService } from "./user-account.service.js";

export async function registerUserAccountRoutes(server: FastifyInstance, options: {
  authService: AuthService;
  cookieName: string;
  cookieSecure: boolean;
  service: UserAccountService;
}): Promise<void> {
  server.get("/api/v1/users/me/privacy-preferences", async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);
    if (!user) return;
    return reply.send({ data: { preferences: await options.service.getPrivacy(user.id) } });
  });
  server.patch("/api/v1/users/me/privacy-preferences", async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);
    if (!user) return;
    const input = privacyPreferencesSchema.safeParse(request.body);
    if (!input.success) return sendValidationError(reply, input.error);
    return reply.send({ data: { preferences: await options.service.updatePrivacy(user.id, input.data) } });
  });
  server.get("/api/v1/users/me/onboarding", async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);
    if (!user) return;
    return reply.send({ data: { onboarding: await options.service.getOnboarding(user.id) } });
  });
  server.patch("/api/v1/users/me/onboarding", async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);
    if (!user) return;
    const input = onboardingSchema.safeParse(request.body);
    if (!input.success) return sendValidationError(reply, input.error);
    return reply.send({ data: { onboarding: await options.service.updateOnboarding(user.id, input.data) } });
  });
  server.post("/api/v1/users/me/export", {
    config: { rateLimit: { max: 3, timeWindow: "1 hour" } }
  }, async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);
    if (!user) return;
    const input = reauthenticateSchema.safeParse(request.body);
    if (!input.success) return sendValidationError(reply, input.error);
    const exported = await options.service.exportAccount(user.id, input.data.password);
    if (!exported) return reply.status(403).send({ error: { code: "REAUTHENTICATION_FAILED", message: "The password was not accepted." } });
    reply.header("content-disposition", `attachment; filename="gym-progress-account-${new Date().toISOString().slice(0, 10)}.json"`);
    return reply.type("application/json").send(exported);
  });
  server.post("/api/v1/users/me/deletion", {
    config: { rateLimit: { max: 3, timeWindow: "1 hour" } }
  }, async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);
    if (!user) return;
    const input = reauthenticateSchema.safeParse(request.body);
    if (!input.success) return sendValidationError(reply, input.error);
    let result: Awaited<ReturnType<UserAccountService["requestDeletion"]>>;
    try {
      result = await options.service.requestDeletion(user.id, input.data.password);
    } catch (error) {
      if (error instanceof AccountEmailDeliveryError) {
        return reply.status(503).send({ error: {
          code: "EMAIL_DELIVERY_FAILED",
          message: "Deletion was not scheduled because the required email could not be delivered. Sign in again before retrying or contact support."
        } });
      }
      throw error;
    }
    if (!result) return reply.status(403).send({ error: { code: "REAUTHENTICATION_FAILED", message: "The password was not accepted." } });
    reply.clearCookie(options.cookieName, { httpOnly: true, path: "/", sameSite: "lax", secure: options.cookieSecure });
    return reply.send({ data: result });
  });
  server.post("/api/v1/users/me/deletion/cancel", {
    config: { rateLimit: { max: 10, timeWindow: "1 hour" } }
  }, async (request, reply) => {
    const input = cancelDeletionSchema.safeParse(request.body);
    if (!input.success) return sendValidationError(reply, input.error);
    const result = await options.service.cancelDeletion(input.data.token);
    return result
      ? reply.send({ data: result })
      : reply.status(400).send({ error: { code: "INVALID_TOKEN", message: "The cancellation link is invalid or expired." } });
  });
  server.post("/api/v1/admin/users/:userId/deletion/cancel", {
    config: { rateLimit: { max: 10, timeWindow: "1 hour" } }
  }, async (request, reply) => {
    const admin = await authenticateRequest(request, reply, options);
    if (!admin) return;
    if (admin.role !== "ADMIN") return reply.status(403).send({ error: { code: "FORBIDDEN", message: "Administrator access is required." } });
    const userId = (request.params as { userId: string }).userId;
    const result = await options.service.cancelDeletionByAdmin(userId, admin.id);
    return result
      ? reply.send({ data: result })
      : reply.status(404).send({ error: { code: "DELETION_NOT_PENDING", message: "No pending deletion was found." } });
  });
}
