import { randomUUID } from "node:crypto";
import type { Mailer, AppLoggerLike } from "../../shared/mailer.js";
import { createAuthActionService } from "./auth-action.service.js";
import type { AuthRepository, AuthUserRecord, NewAuthSession } from "./auth.repository.js";
import type { LoginRequest, SignupRequest } from "./auth.schemas.js";
import type { PasswordHasher } from "./password.js";
import type { SessionTokenGenerator } from "./session-token.js";

export interface PublicUser {
  id: string;
  email: string;
  username: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthenticatedUser {
  user: PublicUser;
  sessionToken: string;
  expiresAt: Date;
}

export type AuthFailureReason =
  | "conflict"
  | "invalid_credentials"
  | "unauthorized"
  | "locked"
  | "invalid_token";

type AuthResult<T> = { ok: true; value: T } | { ok: false; reason: AuthFailureReason };

export interface AuthService {
  signup(input: SignupRequest): Promise<AuthResult<AuthenticatedUser>>;
  login(input: LoginRequest): Promise<AuthResult<AuthenticatedUser>>;
  logout(sessionToken: string | undefined): Promise<{ loggedOut: true }>;
  currentUser(sessionToken: string | undefined): Promise<AuthResult<PublicUser>>;
  requestEmailVerification(userId: string): Promise<{ sent: boolean }>;
  verifyEmail(token: string): Promise<AuthResult<{ verified: true }>>;
  requestPasswordReset(email: string): Promise<{ requested: true }>;
  resetPassword(token: string, newPassword: string): Promise<AuthResult<{ reset: true }>>;
  cleanupExpiredAuthRecords(): Promise<void>;
}

interface AuthServiceOptions {
  repository: AuthRepository;
  passwordHasher: PasswordHasher;
  sessionTokens: SessionTokenGenerator;
  sessionTtlDays: number;
  /** Defaults to a no-op sender; production wiring passes a real transport. */
  mailer?: Mailer;
  appBaseUrl?: string;
  logger?: AppLoggerLike;
  now?: () => Date;
}

const LOCKOUT_THRESHOLD = 10;
const LOCKOUT_MINUTES = 15;

export function createAuthService(options: AuthServiceOptions): AuthService {
  const now = options.now ?? (() => new Date());
  const actions = createAuthActionService({
    repository: options.repository,
    passwordHasher: options.passwordHasher,
    sessionTokens: options.sessionTokens,
    now,
    ...(options.mailer ? { mailer: options.mailer } : {}),
    ...(options.appBaseUrl ? { appBaseUrl: options.appBaseUrl } : {}),
    ...(options.logger ? { logger: options.logger } : {})
  });

  return {
    async signup(input) {
      const passwordHash = await options.passwordHasher.hash(input.password);
      const userId = randomUUID();
      const session = createSession(userId, options.sessionTtlDays, now(), options.sessionTokens);
      const result = await options.repository.createUserWithSession(
        {
          id: userId,
          email: input.email,
          username: input.username,
          passwordHash
        },
        session
      );

      if (result.status === "conflict") {
        return { ok: false, reason: "conflict" };
      }

      await actions.sendSignupVerification(result.user);

      return authenticatedUser(result.user, session);
    },
    async login(input) {
      const user = await options.repository.findUserByUsername(input.username);

      if (!user) {
        return { ok: false, reason: "invalid_credentials" };
      }

      if (user.lockedUntil && user.lockedUntil > now()) {
        return { ok: false, reason: "locked" };
      }

      const passwordMatches = await options.passwordHasher.verify(
        user.passwordHash,
        input.password
      );

      if (!passwordMatches) {
        const attempts = await options.repository.registerFailedLogin(user.id, now());

        if (attempts >= LOCKOUT_THRESHOLD) {
          await options.repository.lockUser(
            user.id,
            new Date(now().getTime() + LOCKOUT_MINUTES * 60 * 1000)
          );
        }

        return { ok: false, reason: "invalid_credentials" };
      }

      if (user.failedLoginAttempts > 0 || user.lockedUntil) {
        await options.repository.clearLoginFailures(user.id);
      }

      const session = createSession(user.id, options.sessionTtlDays, now(), options.sessionTokens);

      await options.repository.createSession(session);

      return authenticatedUser(user, session);
    },
    async logout(sessionToken) {
      if (sessionToken) {
        await options.repository.revokeSession(options.sessionTokens.hash(sessionToken), now());
      }

      return { loggedOut: true };
    },
    async currentUser(sessionToken) {
      if (!sessionToken) {
        return { ok: false, reason: "unauthorized" };
      }

      const user = await options.repository.findUserBySessionTokenHash(
        options.sessionTokens.hash(sessionToken),
        now()
      );

      if (!user) {
        return { ok: false, reason: "unauthorized" };
      }

      return {
        ok: true,
        value: toPublicUser(user)
      };
    },
    requestEmailVerification: actions.requestEmailVerification,
    verifyEmail: actions.verifyEmail,
    requestPasswordReset: actions.requestPasswordReset,
    resetPassword: actions.resetPassword,
    cleanupExpiredAuthRecords: actions.cleanupExpiredAuthRecords
  };
}

function createSession(
  userId: string,
  sessionTtlDays: number,
  now: Date,
  sessionTokens: SessionTokenGenerator
): NewAuthSession & { rawToken: string } {
  const token = sessionTokens.create();
  const expiresAt = new Date(now.getTime() + sessionTtlDays * 24 * 60 * 60 * 1000);

  return {
    id: randomUUID(),
    userId,
    tokenHash: token.tokenHash,
    rawToken: token.rawToken,
    expiresAt
  };
}

function authenticatedUser(
  user: AuthUserRecord,
  session: NewAuthSession & { rawToken: string }
): AuthResult<AuthenticatedUser> {
  return {
    ok: true,
    value: {
      user: toPublicUser(user),
      sessionToken: session.rawToken,
      expiresAt: session.expiresAt
    }
  };
}

function toPublicUser(user: AuthUserRecord): PublicUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    emailVerified: user.emailVerifiedAt !== null,
    createdAt: user.createdAt.toISOString()
  };
}
