import type { FastifyInstance } from "fastify";
import { noopEventTracker } from "../../shared/events.js";
import { sendValidationError } from "../../shared/http-validation.js";
import { authRateLimit, type AuthRouteOptions } from "./auth-route-config.js";
import {
  forgotPasswordRequestSchema,
  resetPasswordRequestSchema,
  verifyEmailRequestSchema
} from "./auth.schemas.js";

export function registerAuthActionRoutes(
  server: FastifyInstance,
  options: AuthRouteOptions
): void {
  const events = options.events ?? noopEventTracker;

  server.post(
    "/api/v1/auth/verify-email",
    { config: authRateLimit },
    async (request, reply) => {
      const parsed = verifyEmailRequestSchema.safeParse(request.body);

      if (!parsed.success) {
        return sendValidationError(reply, parsed.error);
      }

      const result = await options.service.verifyEmail(parsed.data.token);

      if (!result.ok) {
        return reply.status(400).send({
          error: {
            code: "INVALID_TOKEN",
            message: "This verification link is invalid or has expired."
          }
        });
      }

      events.track("email_verified");
      return reply.send({ data: { verified: true } });
    }
  );

  server.post(
    "/api/v1/auth/resend-verification",
    { config: authRateLimit },
    async (request, reply) => {
      const current = await options.service.currentUser(request.cookies[options.cookie.name]);

      if (!current.ok) {
        return reply.status(401).send({
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication is required."
          }
        });
      }

      const result = await options.service.requestEmailVerification(current.value.id);
      return reply.send({ data: { status: result.status } });
    }
  );

  server.post(
    "/api/v1/auth/forgot-password",
    { config: authRateLimit },
    async (request, reply) => {
      const parsed = forgotPasswordRequestSchema.safeParse(request.body);

      if (!parsed.success) {
        return sendValidationError(reply, parsed.error);
      }

      await options.service.requestPasswordReset(parsed.data.email);
      return reply.send({ data: { requested: true } });
    }
  );

  server.post(
    "/api/v1/auth/reset-password",
    { config: authRateLimit },
    async (request, reply) => {
      const parsed = resetPasswordRequestSchema.safeParse(request.body);

      if (!parsed.success) {
        return sendValidationError(reply, parsed.error);
      }

      const result = await options.service.resetPassword(
        parsed.data.token,
        parsed.data.password
      );

      if (!result.ok) {
        return reply.status(400).send({
          error: {
            code: "INVALID_TOKEN",
            message: "This reset link is invalid or has expired. Request a new one."
          }
        });
      }

      events.track("password_reset_completed");
      return reply.send({ data: { reset: true } });
    }
  );
}
