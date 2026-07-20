import type { FastifyReply, FastifyRequest } from "fastify";
import type { AuthService, PublicUser } from "./auth.service.js";

export interface RequestAuthOptions {
  authService: AuthService;
  cookieName: string;
}

export async function authenticateRequest(
  request: FastifyRequest,
  reply: FastifyReply,
  options: RequestAuthOptions
): Promise<PublicUser | null> {
  const result = await options.authService.currentUser(request.cookies[options.cookieName]);

  if (result.ok) {
    return result.value;
  }

  void reply.status(401).send({
    error: {
      code: "UNAUTHORIZED",
      message: "Authentication is required."
    }
  });

  return null;
}
