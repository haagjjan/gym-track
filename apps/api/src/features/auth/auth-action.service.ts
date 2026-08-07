import { randomUUID } from "node:crypto";
import type { AppLoggerLike, Mailer } from "../../shared/mailer.js";
import type {
  ActionTokenPurpose,
  AuthRepository,
  AuthUserRecord
} from "./auth.repository.js";
import type { PasswordHasher } from "./password.js";
import type { SessionTokenGenerator } from "./session-token.js";

type InvalidTokenResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: "invalid_token" };

export interface AuthActionService {
  sendSignupVerification(user: AuthUserRecord): Promise<void>;
  requestEmailVerification(userId: string): Promise<{ status: "FAILED" | "NOT_REQUIRED" | "SENT" }>;
  verifyEmail(token: string): Promise<InvalidTokenResult<{ verified: true }>>;
  requestPasswordReset(email: string): Promise<{ requested: true }>;
  resetPassword(token: string, password: string): Promise<InvalidTokenResult<{ reset: true }>>;
  cleanupExpiredAuthRecords(): Promise<void>;
}

interface AuthActionServiceOptions {
  repository: AuthRepository;
  passwordHasher: PasswordHasher;
  sessionTokens: SessionTokenGenerator;
  mailer?: Mailer;
  appBaseUrl?: string;
  logger?: AppLoggerLike;
  now: () => Date;
}

const noopLogger: AppLoggerLike = {
  info() {},
  warn() {},
  error() {}
};

const noopMailer: Mailer = {
  async send() { return { provider: "log" }; }
};

const VERIFICATION_TOKEN_TTL_HOURS = 24;
const RESET_TOKEN_TTL_MINUTES = 60;

export function createAuthActionService(options: AuthActionServiceOptions): AuthActionService {
  const mailer = options.mailer ?? noopMailer;
  const logger = options.logger ?? noopLogger;
  const appBaseUrl = options.appBaseUrl ?? "http://localhost:3000";

  async function issueToken(
    userId: string,
    purpose: ActionTokenPurpose,
    ttlMs: number
  ): Promise<string> {
    const token = options.sessionTokens.create();

    await options.repository.createActionToken({
      id: randomUUID(),
      userId,
      purpose,
      tokenHash: token.tokenHash,
      expiresAt: new Date(options.now().getTime() + ttlMs)
    });

    return token.rawToken;
  }

  async function sendVerificationEmail(user: AuthUserRecord): Promise<void> {
    const token = await issueToken(
      user.id,
      "email_verification",
      VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000
    );

    await mailer.send({
      kind: "EMAIL_VERIFICATION",
      to: user.email,
      subject: "Verify your Gym Progress Tracker email",
      text: verificationEmailText(user, `${appBaseUrl}/verify-email?token=${token}`)
    });
  }

  return {
    async sendSignupVerification(user) {
      try {
        await sendVerificationEmail(user);
      } catch (error) {
        logger.error({ error }, "verification email failed during signup");
      }
    },
    async requestEmailVerification(userId) {
      const user = await options.repository.findUserById(userId);

      if (!user || user.emailVerifiedAt) {
        return { status: "NOT_REQUIRED" };
      }

      try {
        await sendVerificationEmail(user);
        return { status: "SENT" };
      } catch (error) {
        logger.error({ error }, "verification email failed");
        return { status: "FAILED" };
      }
    },
    async verifyEmail(token) {
      const consumed = await consumeToken(options, token, "email_verification");

      if (!consumed) {
        return { ok: false, reason: "invalid_token" };
      }

      await options.repository.markEmailVerified(consumed.userId, options.now());
      return { ok: true, value: { verified: true } };
    },
    async requestPasswordReset(email) {
      const user = await options.repository.findUserByEmail(email);

      if (user) {
        try {
          const token = await issueToken(
            user.id,
            "password_reset",
            RESET_TOKEN_TTL_MINUTES * 60 * 1000
          );
          await mailer.send({
            kind: "PASSWORD_RESET",
            to: user.email,
            subject: "Reset your Gym Progress Tracker password",
            text: passwordResetEmailText(user, `${appBaseUrl}/reset-password?token=${token}`)
          });
        } catch (error) {
          logger.error({ error }, "password reset email failed");
        }
      }

      return { requested: true };
    },
    async resetPassword(token, password) {
      const consumed = await consumeToken(options, token, "password_reset");

      if (!consumed) {
        return { ok: false, reason: "invalid_token" };
      }

      const passwordHash = await options.passwordHasher.hash(password);
      const changedAt = options.now();
      await options.repository.updatePassword(consumed.userId, passwordHash, changedAt);
      await options.repository.markEmailVerified(consumed.userId, changedAt);
      await options.repository.revokeAllSessionsForUser(consumed.userId, changedAt);
      await options.repository.clearLoginFailures(consumed.userId);

      return { ok: true, value: { reset: true } };
    },
    async cleanupExpiredAuthRecords() {
      const cutoff = new Date(options.now().getTime() - 7 * 24 * 60 * 60 * 1000);
      await options.repository.deleteExpiredAuthRecords(cutoff);
    }
  };
}

function consumeToken(
  options: AuthActionServiceOptions,
  token: string,
  purpose: ActionTokenPurpose
): Promise<{ userId: string } | null> {
  return options.repository.consumeActionToken(
    options.sessionTokens.hash(token),
    purpose,
    options.now()
  );
}

function verificationEmailText(user: AuthUserRecord, link: string): string {
  return [
    `Hi ${user.username},`,
    "",
    "Confirm this email address to secure your training account:",
    link,
    "",
    `The link expires in ${VERIFICATION_TOKEN_TTL_HOURS} hours.`,
    "If you did not create this account, ignore this email."
  ].join("\n");
}

function passwordResetEmailText(user: AuthUserRecord, link: string): string {
  return [
    `Hi ${user.username},`,
    "",
    "Someone requested a password reset for this account. Reset it here:",
    link,
    "",
    `The link expires in ${RESET_TOKEN_TTL_MINUTES} minutes and works once.`,
    "If this was not you, ignore this email — your password is unchanged."
  ].join("\n");
}
