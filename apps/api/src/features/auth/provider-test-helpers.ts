import type { AuthUserRecord, NewAuthUser } from "./auth.repository.js";
import { authenticatedUser, createSession } from "./auth.service.js";
import type { ProviderRepository } from "./provider.repository.js";
import { createProviderService } from "./provider.service.js";
import type { ProviderIdentity } from "./provider-token.js";
import { cryptoSessionTokenGenerator } from "./session-token.js";

export const providerTestUser: AuthUserRecord = {
  id: "user-1", email: "person@example.test", username: "person", passwordHash: null,
  emailVerifiedAt: new Date(), createdAt: new Date(), failedLoginAttempts: 0, lockedUntil: null
};
export const providerTestIdentity: ProviderIdentity = {
  provider: "apple", subject: "subject-1", email: "person@example.test", emailVerified: true
};
export function providerFixture(mode: "ENABLED" | "DISABLED" = "ENABLED") {
  const state = {
    identity: { ...providerTestIdentity }, linked: null as AuthUserRecord | null,
    existing: null as AuthUserRecord | null, created: null as NewAuthUser | null,
    links: 0, signIns: 0, allowLink: true, allowUnlink: true, createConflict: false,
    signInFailure: null as "locked" | "account_unavailable" | null
  };
  const repository: ProviderRepository = {
    async findIdentity() { return state.linked; },
    async findByEmail() { return state.existing; },
    async createAccount(user) {
      state.created = user;
      if (state.createConflict) return { status: "conflict" };
      return { status: "created", user: { ...providerTestUser, ...user, emailVerifiedAt: user.emailVerifiedAt ?? null } };
    },
    async list() { return [{ provider: "apple", created_at: providerTestUser.createdAt }]; },
    async link() { state.links++; return state.allowLink; },
    async unlink() { return state.allowUnlink; }
  };
  const service = createProviderService({
    repository, registrationMode: mode, sessionTokens: cryptoSessionTokenGenerator, sessionTtlDays: 30,
    async verify() { return state.identity; },
    async signIn(user) {
      state.signIns++;
      if (state.signInFailure) return { ok: false, reason: state.signInFailure };
      return authenticatedUser(user, createSession(user.id, 30, new Date(), cryptoSessionTokenGenerator));
    }
  });
  const input = () => ({ provider: "apple" as const, idToken: "signed-token", nonce: service.issueNonce() });
  return { service, state, input };
}
