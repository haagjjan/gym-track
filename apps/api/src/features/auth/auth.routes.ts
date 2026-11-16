import type { FastifyInstance, FastifyReply } from "fastify";
import { createIdentifierLimiter } from "../../shared/identifier-limiter.js";
import { createRateLimitResponse } from "../../shared/rate-limit-response.js";
import { noopEventTracker } from "../../shared/events.js";
import { sendValidationError } from "../../shared/http-validation.js";
import { sendLoginFailure, startSession } from "./auth-response.js";
import { registerProviderRoutes } from "./provider.routes.js";
import { registerAuthActionRoutes } from "./auth-action.routes.js";
import {
  authRateLimit,
  registrationMode,
  type AuthRouteOptions
} from "./auth-route-config.js";
import { loginRequestSchema, signupRequestSchema } from "./auth.schemas.js";
import { isMobileClient, sessionTokenFrom } from "./mobile-client.js";

export async function registerAuthRoutes(
  server: FastifyInstance,
  options: AuthRouteOptions
): Promise<void> {
  const events = options.events ?? noopEventTracker;
  const mode = registrationMode(options);
  const loginLimiter = createIdentifierLimiter({ max: 10, windowMs: 15 * 60 * 1000 });

  server.post(
    "/api/v1/auth/signup",
    {
      config: authRateLimit,
      onRequest: (_request, reply, done) => {
        if (mode !== "DISABLED") {
          done();
          return;
        }

        sendRegistrationDisabled(reply);
      }
    },
    async (request, reply) => {
      const parsed = signupRequestSchema.safeParse(request.body);

      if (!parsed.success) {
        return sendValidationError(reply, parsed.error);
      }

      const result = await options.service.signup(parsed.data);

      if (!result.ok) {
        return reply.status(409).send({
          error: {
            code: "AUTH_CONFLICT",
            message: "Email or username already exists."
          }
        });
      }

      events.track("user_signed_up", result.value.user.id);
      return reply.status(201).send({
        data: startSession(request, reply, options.cookie, result.value)
      });
    }
  );

  server.post("/api/v1/auth/login", { config: authRateLimit }, async (request, reply) => {
    const parsed = loginRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    const limit = loginLimiter.consume(parsed.data.username);
    if (!limit.allowed) {
      return reply.header("retry-after", limit.retryAfterSeconds).status(429).send(
        createRateLimitResponse({ statusCode: 429, after: `${limit.retryAfterSeconds} seconds` })
      );
    }

    const result = await options.service.login(parsed.data);

    if (!result.ok) {
      return sendLoginFailure(reply, result.reason);
    }

    events.track("user_logged_in", result.value.user.id);
    return reply.send({
      data: startSession(request, reply, options.cookie, result.value)
    });
  });

  server.post("/api/v1/auth/logout", async (request, reply) => {
    await options.service.logout(sessionTokenFrom(request, options.cookie.name));

    if (!isMobileClient(request)) {
      reply.clearCookie(options.cookie.name, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: options.cookie.secure
      });
    }

    return reply.send({
      data: {
        loggedOut: true
      }
    });
  });

  server.get("/api/v1/auth/me", async (request, reply) => {
    const result = await options.service.currentUser(sessionTokenFrom(request, options.cookie.name));

    if (!result.ok) {
      return reply.status(401).send({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication is required."
        }
      });
    }

    return reply.send({
      data: {
        user: result.value
      }
    });
  });

  registerAuthActionRoutes(server, options);
  if (options.providerService) await registerProviderRoutes(server, options);
}

function sendRegistrationDisabled(reply: FastifyReply): void {
  void reply.status(403).send({
    error: {
      code: "REGISTRATION_DISABLED",
      message: "Registration is currently disabled."
    }
  });
}
