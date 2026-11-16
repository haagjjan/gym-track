import type { FastifyReply, FastifyRequest } from "fastify";
import type { AuthCookieOptions } from "./auth-route-config.js";
import type { AuthenticatedUser, PublicUser, AuthFailureReason } from "./auth.service.js";
import { isMobileClient } from "./mobile-client.js";

interface SessionStartPayload {
  user: PublicUser;
  sessionToken?: string;
  expiresAt?: string;
}

/**
 * The web gets the session as an HttpOnly cookie. The mobile app gets the token in
 * the body instead and keeps it in the device's secure storage (ADR 0023).
 */
export function startSession(
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

export function sendLoginFailure(reply: FastifyReply, reason: AuthFailureReason) {
  if (reason === "account_unavailable") {
    return reply.status(403).send({
      error: { code: "ACCOUNT_UNAVAILABLE", message: "This account is not currently available." }
    });
  }
  if (reason === "locked") {
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
