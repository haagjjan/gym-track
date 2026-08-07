import { randomUUID } from "node:crypto";
import type { AppLoggerLike, Mailer } from "../../shared/mailer.js";
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
  logger?: AppLoggerLike;
  now?: () => Date;
}) {
  const now = options.now ?? (() => new Date());
  const logger = options.logger ?? { info() {}, warn() {}, error() {} };

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
        if (!options.mailer) throw new Error("Email delivery is unavailable.");
        await options.mailer.send({
          kind: "DELETION_SCHEDULED",
          to: credentials.email,
          subject: "Account deletion scheduled",
          text: `Your personal records and workout history are scheduled for permanent deletion on ${dueAt.toISOString()}. If you change your mind, cancel before that deadline: ${options.appBaseUrl}/cancel-deletion?token=${encodeURIComponent(token.rawToken)}\n\nYou can also email ${options.supportEmail} immediately. After permanent deletion, your data cannot be recovered.`
        });
      } catch (error) {
        await options.repository.cancelDeletion(token.tokenHash, now());
        logger.error({ error }, "deletion scheduling email failed; account restored");
        throw new AccountEmailDeliveryError();
      }
      return { deletionDueAt: dueAt.toISOString() };
    },
    async cancelDeletion(rawToken: string) {
      const cancelled = await options.repository.cancelDeletion(options.tokens.hash(rawToken), now());
      if (!cancelled) return null;
      const notificationStatus = await sendInformationalMail(options.mailer, logger, {
        kind: "DELETION_CANCELLED", to: cancelled.email,
        subject: "Account deletion cancelled",
        text: "Your Gym Progress Tracker account deletion was cancelled. You can sign in again normally."
      });
      return { cancelled: true as const, notificationStatus };
    },
    async cancelDeletionByAdmin(userId: string, adminUserId: string) {
      const cancelled = await options.repository.cancelDeletionByAdmin(userId, adminUserId, now());
      if (!cancelled) return null;
      const notificationStatus = await sendInformationalMail(options.mailer, logger, {
        kind: "DELETION_CANCELLED_BY_SUPPORT", to: cancelled.email,
        subject: "Account deletion cancelled by support",
        text: "Support cancelled your Gym Progress Tracker account deletion before the deadline. You can sign in again normally. Contact support immediately if you did not request this cancellation."
      });
      return { cancelled: true as const, notificationStatus };
    },
    async cleanupDeletions() {
      const cleanupAt = now();
      const due = await options.repository.listDueDeletions(cleanupAt);
      let finalized = 0;
      let deletionFailures = 0;
      let notificationFailures = 0;
      for (const user of due) {
        try {
          const deleted = await options.repository.finalizeDeletion(user.id, cleanupAt);
          if (!deleted) continue;
          finalized += 1;
          const status = await sendInformationalMail(options.mailer, logger, {
            kind: "DELETION_COMPLETED", to: user.email,
            subject: "Account deletion completed",
            text: "Your Gym Progress Tracker account and live personal data have been permanently deleted. Encrypted recovery backups age out within 30 days and are not used to restore individual accounts."
          });
          if (status === "FAILED") notificationFailures += 1;
        } catch (error) {
          deletionFailures += 1;
          logger.error({ error }, "account deletion finalization failed");
        }
      }
      return { due: due.length, finalized, deletionFailures, notificationFailures };
    },
    cleanupRetention: () => options.repository.cleanupRetention(now())
  };
}

export class AccountEmailDeliveryError extends Error {
  public constructor() {
    super("Required account email delivery failed.");
    this.name = "AccountEmailDeliveryError";
  }
}

async function sendInformationalMail(
  mailer: Mailer | undefined,
  logger: AppLoggerLike,
  message: Parameters<Mailer["send"]>[0]
): Promise<"FAILED" | "SENT"> {
  if (!mailer) return "FAILED";
  try {
    await mailer.send(message);
    return "SENT";
  } catch (error) {
    logger.error({ error, kind: message.kind }, "informational account email failed");
    return "FAILED";
  }
}

export type UserAccountService = ReturnType<typeof createUserAccountService>;
