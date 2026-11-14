import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { noopEventTracker } from "../../shared/events.js";
import { sendValidationError } from "../../shared/http-validation.js";
import { registerAuthActionRoutes } from "./auth-action.routes.js";
import {
  authRateLimit,
  registrationMode,
  type AuthCookieOptions,
  type AuthRouteOptions
} from "./auth-route-config.js";
import { loginRequestSchema, signupRequestSchema } from "./auth.schemas.js";
import type { AuthenticatedUser, PublicUser } from "./auth.service.js";
import { isMobileClient, sessionTokenFrom } from "./mobile-client.js";

export async function registerAuthRoutes(
  server: FastifyInstance,
  options: AuthRouteOptions
): Promise<void> {
  const events = options.events ?? noopEventTracker;
  const mode = registrationMode(options);

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

    const result = await options.service.login(parsed.data);

    if (!result.ok) {
      if (result.reason === "account_unavailable") {
        return reply.status(403).send({
          error: { code: "ACCOUNT_UNAVAILABLE", message: "This account is not currently available." }
        });
      }
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
}

interface SessionStartPayload {
  user: PublicUser;
  sessionToken?: string;
  expiresAt?: string;
}

/**
 * The web gets the session as an HttpOnly cookie. The mobile app gets the token in
 * the body instead and keeps it in the device's secure storage (ADR 0023).
 */
function startSession(
  request: FastifyRequest,
  reply: FastifyReply,
  options: AuthCookieOptions,
  authenticated: AuthenticatedUser
): SessionStartPayload {
  if (isMobileClient(request)) {
    return {
      user: authenticated.user,
      sessionToken: authenticated.sessionToken,
      expiresAt: authenticated.expiresAt.toISOString()
    };
  }

  setSessionCookie(reply, options, authenticated);

  return { user: authenticated.user };
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

function sendRegistrationDisabled(reply: FastifyReply): void {
  void reply.status(403).send({
    error: {
      code: "REGISTRATION_DISABLED",
      message: "Registration is currently disabled."
    }
  });
}
