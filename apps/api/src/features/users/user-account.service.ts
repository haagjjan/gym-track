import { randomUUID } from "node:crypto";
import type { Mailer } from "../../shared/mailer.js";
import type { PasswordHasher } from "../auth/password.js";
import type { SessionTokenGenerator } from "../auth/session-token.js";
import type { UserAccountRepository } from "./user-account.repository.js";
import type { OnboardingUpdate, PrivacyPreferencesUpdate } from "./user-account.schemas.js";

export function createUserAccountService(options: {
  repository: UserAccountRepository;
  passwordHasher: PasswordHasher;
  tokens: SessionTokenGenerator;
  mailer?: Mailer | undefined;
  appBaseUrl: string;
  supportEmail: string;
  now?: () => Date;
}) {
  const now = options.now ?? (() => new Date());

  async function reauthenticate(userId: string, password: string) {
    const credentials = await options.repository.getCredentials(userId);
    if (!credentials || credentials.accountStatus !== "ACTIVE") return null;
    return await options.passwordHasher.verify(credentials.passwordHash, password) ? credentials : null;
  }

  return {
    getPrivacy: (userId: string) => options.repository.getPrivacy(userId),
    updatePrivacy: (userId: string, update: PrivacyPreferencesUpdate) =>
      options.repository.updatePrivacy(userId, update, now()),
    getOnboarding: (userId: string) => options.repository.getOnboarding(userId),
    updateOnboarding: (userId: string, update: OnboardingUpdate) =>
      options.repository.updateOnboarding(userId, update, now()),
    async exportAccount(userId: string, password: string) {
      if (!await reauthenticate(userId, password)) return null;
      return options.repository.exportAccount(userId);
    },
    async requestDeletion(userId: string, password: string) {
      const credentials = await reauthenticate(userId, password);
      if (!credentials) return null;
      const requestedAt = now();
      const dueAt = new Date(requestedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
      const token = options.tokens.create();
      const requested = await options.repository.requestDeletion(userId, {
        id: randomUUID(), hash: token.tokenHash, expiresAt: dueAt
      }, requestedAt, dueAt);
      if (!requested) return null;
      try {
        await options.mailer?.send({
          to: credentials.email,
          subject: "Account deletion scheduled",
          text: `Your personal records and workout history are scheduled for permanent deletion on ${dueAt.toISOString()}. If you change your mind, cancel before that deadline: ${options.appBaseUrl}/cancel-deletion?token=${encodeURIComponent(token.rawToken)}\n\nYou can also email ${options.supportEmail} immediately. After permanent deletion, your data cannot be recovered.`
        });
      } catch (error) {
        await options.repository.cancelDeletion(token.tokenHash, now());
        throw error;
      }
      return { deletionDueAt: dueAt.toISOString() };
    },
    async cancelDeletion(rawToken: string) {
      const cancelled = await options.repository.cancelDeletion(options.tokens.hash(rawToken), now());
      if (cancelled) await options.mailer?.send({
        to: cancelled.email,
        subject: "Account deletion cancelled",
        text: "Your Gym Progress Tracker account deletion was cancelled. You can sign in again normally."
      });
      return Boolean(cancelled);
    },
    async cancelDeletionByAdmin(userId: string, adminUserId: string) {
      const cancelled = await options.repository.cancelDeletionByAdmin(userId, adminUserId, now());
      if (cancelled) await options.mailer?.send({
        to: cancelled.email,
        subject: "Account deletion cancelled by support",
        text: "Support cancelled your Gym Progress Tracker account deletion before the deadline. You can sign in again normally. Contact support immediately if you did not request this cancellation."
      });
      return Boolean(cancelled);
    },
    async cleanup() {
      const cleanupAt = now();
      const due = await options.repository.listDueDeletions(cleanupAt);
      for (const user of due) {
        const deleted = await options.repository.finalizeDeletion(user.id, cleanupAt);
        if (deleted) await options.mailer?.send({
          to: user.email,
          subject: "Account deletion completed",
          text: "Your Gym Progress Tracker account and live personal data have been permanently deleted. Encrypted recovery backups age out within 30 days and are not used to restore individual accounts."
        });
      }
      await options.repository.cleanupRetention(cleanupAt);
    }
  };
}

export type UserAccountService = ReturnType<typeof createUserAccountService>;
