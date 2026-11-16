import type { FastifyInstance, FastifyReply } from "fastify";
import { sendValidationError } from "../../shared/http-validation.js";
import { authenticateRequest } from "./authenticate-request.js";
import { authRateLimit, type AuthRouteOptions } from "./auth-route-config.js";
import { sendLoginFailure, startSession } from "./auth-response.js";
import { providerRequestSchema, providerSchema } from "./provider.schemas.js";
import { ProviderAuthError } from "./provider-token.js";

const messages: Record<string, string> = {
  REGISTRATION_DISABLED: "Registration is currently disabled.",
  PROVIDER_SIGNUP_CONSENT_REQUIRED: "Accept the policies and confirm age and Swiss residence to create an account.",
  PROVIDER_LINK_REQUIRES_SIGN_IN: "Sign in with your password and link this provider in Settings.",
  PROVIDER_IDENTITY_CONFLICT: "This identity belongs to another account.",
  LAST_SIGN_IN_METHOD: "Set a password or link another provider before unlinking.",
  PROVIDER_UNAVAILABLE: "This provider is unavailable.",
  INVALID_PROVIDER_TOKEN: "The provider token is invalid or could not be verified.",
  INVALID_PROVIDER_NONCE: "The nonce is invalid, expired or already used.",
  AUTH_CONFLICT: "An account or identity already exists. Retry sign-in with a fresh nonce and token."
};

async function handle(reply: FastifyReply, action: () => Promise<unknown>) {
  try {
    return await action();
  } catch (error) {
    if (!(error instanceof ProviderAuthError)) throw error;
    return reply.status(error.status).send({ error: { code: error.code, message: messages[error.code] ?? error.code } });
  }
}

export async function registerProviderRoutes(server: FastifyInstance, options: AuthRouteOptions) {
  const service = options.providerService;
  if (!service) return;
  const auth = { authService: options.service, cookieName: options.cookie.name };
  server.post("/api/v1/auth/provider/nonce", { config: authRateLimit }, async (_request, reply) =>
    reply.send({ data: { nonce: service.issueNonce() } }));
  server.post("/api/v1/auth/provider", { config: authRateLimit }, async (request, reply) => {
    const parsed = providerRequestSchema.safeParse(request.body);
    if (!parsed.success) return sendValidationError(reply, parsed.error);
    return handle(reply, async () => {
      const result = await service.login(parsed.data);
      if (!result.ok) return sendLoginFailure(reply, result.reason);
      options.events?.track("user_logged_in", result.value.user.id);
      return reply.send({ data: startSession(request, reply, options.cookie, result.value) });
    });
  });
  server.get("/api/v1/users/me/identities", async (request, reply) => {
    const user = await authenticateRequest(request, reply, auth);
    if (!user) return;
    return reply.send({ data: { identities: await service.list(user.id) } });
  });
  server.post("/api/v1/users/me/identities", { config: authRateLimit }, async (request, reply) => {
    const user = await authenticateRequest(request, reply, auth);
    if (!user) return;
    const parsed = providerRequestSchema.safeParse(request.body);
    if (!parsed.success) return sendValidationError(reply, parsed.error);
    return handle(reply, async () => reply.send({ data: await service.link(user.id, parsed.data) }));
  });
  server.delete("/api/v1/users/me/identities/:provider", { config: authRateLimit }, async (request, reply) => {
    const user = await authenticateRequest(request, reply, auth);
    if (!user) return;
    const provider = providerSchema.safeParse((request.params as { provider: string }).provider);
    if (!provider.success) return sendValidationError(reply, provider.error);
    return handle(reply, async () => reply.send({ data: await service.unlink(user.id, provider.data) }));
  });
}
