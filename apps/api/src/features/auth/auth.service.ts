import { randomUUID } from "node:crypto";
import type {
  AuthRepository,
  AuthUserRecord,
  NewAuthSession
} from "./auth.repository.js";
import type { LoginRequest, SignupRequest } from "./auth.schemas.js";
import type { PasswordHasher } from "./password.js";
import type { SessionTokenGenerator } from "./session-token.js";

export interface PublicUser {
  id: string;
  email: string;
  username: string;
  createdAt: string;
}
export interface AuthenticatedUser {
  user: PublicUser;
  sessionToken: string;
  expiresAt: Date;
}
type AuthResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: "conflict" | "invalid_credentials" | "unauthorized" };
export interface AuthService {
  signup(input: SignupRequest): Promise<AuthResult<AuthenticatedUser>>;
  login(input: LoginRequest): Promise<AuthResult<AuthenticatedUser>>;
  logout(sessionToken: string | undefined): Promise<{ loggedOut: true }>;
  currentUser(sessionToken: string | undefined): Promise<AuthResult<PublicUser>>;
}
interface AuthServiceOptions {
  repository: AuthRepository;
  passwordHasher: PasswordHasher;
  sessionTokens: SessionTokenGenerator;
  sessionTtlDays: number;
  now?: () => Date;
}
export function createAuthService(options: AuthServiceOptions): AuthService {
  const now = options.now ?? (() => new Date());

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

      return authenticatedUser(result.user, session);
    },
    async login(input) {
      const user = await options.repository.findUserByUsername(input.username);

      if (!user) {
        return { ok: false, reason: "invalid_credentials" };
      }

      const passwordMatches = await options.passwordHasher.verify(user.passwordHash, input.password);

      if (!passwordMatches) {
        return { ok: false, reason: "invalid_credentials" };
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
    }
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
    createdAt: user.createdAt.toISOString()
  };
}
