import type { FastifyInstance, FastifyReply } from "fastify";
import type { ZodError } from "zod";
import type { AuthService, AuthenticatedUser } from "./auth.service.js";
import { loginRequestSchema, signupRequestSchema } from "./auth.schemas.js";

interface AuthCookieOptions {
  name: string;
  secure: boolean;
  maxAgeSeconds: number;
}

interface AuthRouteOptions {
  service: AuthService;
  cookie: AuthCookieOptions;
}

export async function registerAuthRoutes(
  server: FastifyInstance,
  options: AuthRouteOptions
): Promise<void> {
  server.post("/api/v1/auth/signup", async (request, reply) => {
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

    setSessionCookie(reply, options.cookie, result.value);

    return reply.status(201).send({
      data: {
        user: result.value.user
      }
    });
  });

  server.post("/api/v1/auth/login", async (request, reply) => {
    const parsed = loginRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    const result = await options.service.login(parsed.data);

    if (!result.ok) {
      return reply.status(401).send({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Username or password is incorrect."
        }
      });
    }

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

function sendValidationError(reply: FastifyReply, error: ZodError) {
  return reply.status(422).send({
    error: {
      code: "VALIDATION_ERROR",
      message: "One or more fields are invalid.",
      fields: toFieldErrors(error)
    }
  });
}

function toFieldErrors(error: ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "body");
    fields[key] = [...(fields[key] ?? []), issue.message];
  }

  return fields;
}
