import type { FastifyInstance, FastifyReply } from "fastify";
import { noopEventTracker } from "../../shared/events.js";
import { sendValidationError } from "../../shared/http-validation.js";
import { registerAuthActionRoutes } from "./auth-action.routes.js";
import {
  authRateLimit,
  type AuthCookieOptions,
  type AuthRouteOptions
} from "./auth-route-config.js";
import { loginRequestSchema, signupRequestSchema } from "./auth.schemas.js";
import type { AuthenticatedUser } from "./auth.service.js";

export async function registerAuthRoutes(
  server: FastifyInstance,
  options: AuthRouteOptions
): Promise<void> {
  const events = options.events ?? noopEventTracker;

  server.post("/api/v1/auth/signup", { config: authRateLimit }, async (request, reply) => {
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
    setSessionCookie(reply, options.cookie, result.value);

    return reply.status(201).send({
      data: {
        user: result.value.user
      }
    });
  });

  server.post("/api/v1/auth/login", { config: authRateLimit }, async (request, reply) => {
    const parsed = loginRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    const result = await options.service.login(parsed.data);

    if (!result.ok) {
      if (result.reason === "locked") {
        return reply.status(423).send({
          error: {
            code: "ACCOUNT_LOCKED",
            message: "Too many failed attempts. Try again in a few minutes."
          }
        });
      }

      return reply.status(401).send({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Username or password is incorrect."
        }
      });
    }

    events.track("user_logged_in", result.value.user.id);
    setSessionCookie(reply, options.cookie, result.value);

    return reply.send({
      data: {
        user: result.value.user
      }
    });
  });

  server.post("/api/v1/auth/logout", async (request, reply) => {
    await options.service.logout(request.cookies[options.cookie.name]);
    reply.clearCookie(options.cookie.name, { path: "/" });

    return reply.send({
      data: {
        loggedOut: true
      }
    });
  });

  server.get("/api/v1/auth/me", async (request, reply) => {
    const result = await options.service.currentUser(request.cookies[options.cookie.name]);

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
}

function setSessionCookie(
  reply: FastifyReply,
  options: AuthCookieOptions,
  authenticated: AuthenticatedUser
): void {
  reply.setCookie(options.name, authenticated.sessionToken, {
    expires: authenticated.expiresAt,
    httpOnly: true,
    maxAge: options.maxAgeSeconds,
    path: "/",
    sameSite: "lax",
    secure: options.secure
  });
}
