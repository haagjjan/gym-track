import { randomBytes, randomUUID } from "node:crypto";
import type { AuthenticatedUser, AuthFailureReason } from "./auth.service.js";
import { authenticatedUser, createSession } from "./auth.service.js";
import type { AuthUserRecord } from "./auth.repository.js";
import type { SessionTokenGenerator } from "./session-token.js";
import { createProviderNonceStore } from "./provider-nonce.js";
import { ProviderAuthError, type Provider, type ProviderIdentity } from "./provider-token.js";
import type { ProviderRequest } from "./provider.schemas.js";
import type { ProviderRepository } from "./provider.repository.js";

type SignInResult = { ok: true; value: AuthenticatedUser } | { ok: false; reason: AuthFailureReason };

export function createProviderService(options: {
  repository: ProviderRepository;
  verify: (provider: Provider, token: string, nonce: string) => Promise<ProviderIdentity>;
  signIn: (user: AuthUserRecord) => Promise<SignInResult>;
  sessionTokens: SessionTokenGenerator;
  sessionTtlDays: number;
  registrationMode: "ENABLED" | "DISABLED";
  now?: () => Date;
  nonces?: ReturnType<typeof createProviderNonceStore>;
}) {
  const now = options.now ?? (() => new Date());
  const nonces = options.nonces ?? createProviderNonceStore({ now: () => now().getTime() });
  const repository = options.repository;

  async function identify(input: ProviderRequest) {
    if (!nonces.consume(input.nonce)) throw new ProviderAuthError("INVALID_PROVIDER_NONCE");
    return options.verify(input.provider, input.idToken, input.nonce);
  }

  async function signup(input: ProviderRequest, identity: ProviderIdentity): Promise<SignInResult> {
    if (options.registrationMode === "DISABLED") throw new ProviderAuthError("REGISTRATION_DISABLED", 403);
    if (!input.signup) throw new ProviderAuthError("PROVIDER_SIGNUP_CONSENT_REQUIRED", 409);
    const id = randomUUID();
    const suffix = randomBytes(8).toString("hex");
    const local = identity.email?.split("@")[0]?.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 30) || "user";
    const session = createSession(id, options.sessionTtlDays, now(), options.sessionTokens);
    const result = await repository.createAccount({
      id, email: identity.email ?? `${id}@provider.invalid`, username: `${local}_${suffix}`,
      passwordHash: null, emailVerifiedAt: identity.emailVerified ? now() : null,
      termsVersion: input.signup.termsVersion, privacyVersion: input.signup.privacyVersion,
      adultAttestedAt: now()
    }, session, identity);
    if (result.status === "conflict") throw new ProviderAuthError("AUTH_CONFLICT", 409);
    return authenticatedUser(result.user, session);
  }

  return {
    issueNonce: () => nonces.issue(),
    async login(input: ProviderRequest): Promise<SignInResult> {
      const identity = await identify(input);
      const linked = await repository.findIdentity(identity);
      if (linked) return options.signIn(linked);
      const existing = identity.email ? await repository.findByEmail(identity.email) : null;
      if (!existing) return signup(input, identity);
      if (!identity.emailVerified || !existing.emailVerifiedAt) {
        throw new ProviderAuthError("PROVIDER_LINK_REQUIRES_SIGN_IN", 409);
      }
      if (!await repository.link(existing.id, identity)) throw new ProviderAuthError("PROVIDER_IDENTITY_CONFLICT", 409);
      return options.signIn(existing);
    },
    list: repository.list,
    async link(userId: string, input: ProviderRequest) {
      const identity = await identify(input);
      if (!await repository.link(userId, identity)) throw new ProviderAuthError("PROVIDER_IDENTITY_CONFLICT", 409);
      return { linked: true };
    },
    async unlink(userId: string, provider: Provider) {
      if (!await repository.unlink(userId, provider)) throw new ProviderAuthError("LAST_SIGN_IN_METHOD", 409);
      return { unlinked: true };
    }
  };
}

export type ProviderService = ReturnType<typeof createProviderService>;
