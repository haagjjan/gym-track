import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  AuthRepository,
  AuthUserRecord,
  CreateUserWithSessionResult,
  NewActionToken,
  NewAuthSession,
  NewAuthUser
} from "./auth.repository.js";
import { createAuthService } from "./auth.service.js";
import type { PasswordHasher } from "./password.js";
import type { SessionTokenGenerator } from "./session-token.js";

const createdAt = new Date("2026-05-20T10:00:00.000Z");
const now = new Date("2026-05-20T12:00:00.000Z");

function userRecord(overrides: Partial<AuthUserRecord> = {}): AuthUserRecord {
  return {
    id: "user-1",
    email: "jan@example.com",
    username: "jan",
    passwordHash: "hashed-password",
    emailVerifiedAt: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt,
    ...overrides
  };
}

function passwordHasher(matches = true, onVerify?: () => void): PasswordHasher {
  return {
    async hash(password) {
      return `hashed:${password}`;
    },
    async verify() {
      onVerify?.();
      return matches;
    }
  };
}

function sessionTokens(): SessionTokenGenerator {
  return {
    create() {
      return {
        rawToken: "raw-session-token",
        tokenHash: "hashed-session-token"
      };
    },
    hash(rawToken) {
      return `hashed:${rawToken}`;
    }
  };
}

class FakeAuthRepository implements AuthRepository {
  public createdSession: NewAuthSession | null = null;
  public revokedTokenHash: string | null = null;
  public createdActionTokens: NewActionToken[] = [];
  public failedLoginCount = 0;
  public lockedUserUntil: Date | null = null;
  public clearedFailures = false;
  public verifiedUserId: string | null = null;
  public updatedPasswordHash: string | null = null;
  public revokedAllForUserId: string | null = null;
  public consumableToken: { userId: string } | null = null;

  public constructor(
    private readonly existingUser: AuthUserRecord | null = userRecord(),
    private readonly createResult: CreateUserWithSessionResult = {
      status: "created",
      user: userRecord()
    }
  ) {}

  public async createUserWithSession(
    _user: NewAuthUser,
    session: NewAuthSession
  ): Promise<CreateUserWithSessionResult> {
    this.createdSession = session;

    return this.createResult;
  }

  public async createSession(session: NewAuthSession): Promise<void> {
    this.createdSession = session;
  }

  public async findUserByUsername(): Promise<AuthUserRecord | null> {
    return this.existingUser;
  }

  public async findUserByEmail(): Promise<AuthUserRecord | null> {
    return this.existingUser;
  }

  public async findUserById(): Promise<AuthUserRecord | null> {
    return this.existingUser;
  }

  public async findUserBySessionTokenHash(): Promise<AuthUserRecord | null> {
    return this.existingUser;
  }

  public async revokeSession(tokenHash: string): Promise<void> {
    this.revokedTokenHash = tokenHash;
  }

  public async revokeAllSessionsForUser(userId: string): Promise<void> {
    this.revokedAllForUserId = userId;
  }

  public async registerFailedLogin(): Promise<number> {
    this.failedLoginCount += 1;

    return this.failedLoginCount;
  }

  public async lockUser(_userId: string, lockedUntil: Date): Promise<void> {
    this.lockedUserUntil = lockedUntil;
  }

  public async clearLoginFailures(): Promise<void> {
    this.clearedFailures = true;
  }

  public async markEmailVerified(userId: string): Promise<void> {
    this.verifiedUserId = userId;
  }

  public async updatePassword(_userId: string, passwordHash: string): Promise<void> {
    this.updatedPasswordHash = passwordHash;
  }

  public async createActionToken(token: NewActionToken): Promise<void> {
    this.createdActionTokens.push(token);
  }

  public async consumeActionToken(): Promise<{ userId: string } | null> {
    return this.consumableToken;
  }

  public async deleteExpiredAuthRecords(): Promise<void> {}
}

describe("auth service", () => {
  it("creates a user and session on signup", async () => {
    const repository = new FakeAuthRepository();
    const service = createAuthService({
      repository,
      passwordHasher: passwordHasher(),
      sessionTokens: sessionTokens(),
      sessionTtlDays: 30,
      now: () => now
    });

    const result = await service.signup({
      email: "jan@example.com",
      username: "jan",
      password: "secret"
    });

    assert.equal(result.ok, true);

    if (result.ok) {
      assert.equal(result.value.sessionToken, "raw-session-token");
      assert.equal(result.value.expiresAt.toISOString(), "2026-06-19T12:00:00.000Z");
      assert.equal(result.value.user.createdAt, createdAt.toISOString());
    }

    assert.equal(repository.createdSession?.tokenHash, "hashed-session-token");
  });

  it("returns conflict when signup hits a unique constraint", async () => {
    const repository = new FakeAuthRepository(null, { status: "conflict" });
    const service = createAuthService({
      repository,
      passwordHasher: passwordHasher(),
      sessionTokens: sessionTokens(),
      sessionTtlDays: 30,
      now: () => now
    });

    const result = await service.signup({
      email: "jan@example.com",
      username: "jan",
      password: "secret"
    });

    assert.deepEqual(result, { ok: false, reason: "conflict" });
  });

  it("creates a new session on valid login", async () => {
    const repository = new FakeAuthRepository();
    const service = createAuthService({
      repository,
      passwordHasher: passwordHasher(true),
      sessionTokens: sessionTokens(),
      sessionTtlDays: 30,
      now: () => now
    });

    const result = await service.login({
      username: "jan",
      password: "secret"
    });

    assert.equal(result.ok, true);
    assert.equal(repository.createdSession?.userId, "user-1");
  });

  it("rejects invalid login credentials after verifying known and unknown usernames", async () => {
    let verificationCount = 0;
    const hasher = passwordHasher(false, () => { verificationCount += 1; });
    const service = createAuthService({
      repository: new FakeAuthRepository(),
      passwordHasher: hasher,
      sessionTokens: sessionTokens(),
      sessionTtlDays: 30,
      now: () => now
    });

    const result = await service.login({
      username: "jan",
      password: "bad-password"
    });

    assert.deepEqual(result, { ok: false, reason: "invalid_credentials" });
    const unknownService = createAuthService({
      repository: new FakeAuthRepository(null),
      passwordHasher: hasher,
      sessionTokens: sessionTokens(),
      sessionTtlDays: 30,
      now: () => now
    });
    const unknownResult = await unknownService.login({
      username: "unknown-user",
      password: "bad-password"
    });

    assert.deepEqual(unknownResult, { ok: false, reason: "invalid_credentials" });
    assert.equal(verificationCount, 2);
  });

  it("revokes a hashed session token on logout", async () => {
    const repository = new FakeAuthRepository();
    const service = createAuthService({
      repository,
      passwordHasher: passwordHasher(),
      sessionTokens: sessionTokens(),
      sessionTtlDays: 30,
      now: () => now
    });

    await service.logout("raw-session-token");

    assert.equal(repository.revokedTokenHash, "hashed:raw-session-token");
  });

  it("issues a verification token and emails the link on signup", async () => {
    const repository = new FakeAuthRepository();
    const sentMail: { to: string; text: string }[] = [];
    const service = createAuthService({
      repository,
      passwordHasher: passwordHasher(),
      sessionTokens: sessionTokens(),
      sessionTtlDays: 30,
      appBaseUrl: "https://cockpit.example",
      mailer: {
        async send(message) {
          sentMail.push({ to: message.to, text: message.text });
          return { provider: "log" };
        }
      },
      now: () => now
    });

    const result = await service.signup({
      email: "jan@example.com",
      username: "jan",
      password: "long-enough-secret"
    });

    assert.equal(result.ok, true);
    assert.equal(repository.createdActionTokens[0]?.purpose, "email_verification");
    assert.equal(sentMail[0]?.to, "jan@example.com");
    assert.ok(sentMail[0]?.text.includes("https://cockpit.example/verify-email?token="));
  });

  it("reports verification resend delivery and not-required states", async () => {
    const unverified = createAuthService({
      repository: new FakeAuthRepository(),
      passwordHasher: passwordHasher(),
      sessionTokens: sessionTokens(),
      sessionTtlDays: 30,
      mailer: { async send() { throw new Error("provider unavailable"); } },
      now: () => now
    });
    const verified = createAuthService({
      repository: new FakeAuthRepository(userRecord({ emailVerifiedAt: now })),
      passwordHasher: passwordHasher(),
      sessionTokens: sessionTokens(),
      sessionTtlDays: 30,
      now: () => now
    });

    assert.deepEqual(await unverified.requestEmailVerification("user-1"), { status: "FAILED" });
    assert.deepEqual(await verified.requestEmailVerification("user-1"), { status: "NOT_REQUIRED" });
  });

  it("rejects login while the account is locked", async () => {
    const lockedUntil = new Date(now.getTime() + 5 * 60 * 1000);
    const service = createAuthService({
      repository: new FakeAuthRepository(userRecord({ lockedUntil })),
      passwordHasher: passwordHasher(true),
      sessionTokens: sessionTokens(),
      sessionTtlDays: 30,
      now: () => now
    });

    const result = await service.login({ username: "jan", password: "whatever" });

    assert.deepEqual(result, { ok: false, reason: "locked" });
  });

  it("locks the account when failed logins reach the threshold", async () => {
    const repository = new FakeAuthRepository();

    repository.failedLoginCount = 9;

    const service = createAuthService({
      repository,
      passwordHasher: passwordHasher(false),
      sessionTokens: sessionTokens(),
      sessionTtlDays: 30,
      now: () => now
    });

    await service.login({ username: "jan", password: "bad" });

    assert.ok(repository.lockedUserUntil);
    assert.equal(
      repository.lockedUserUntil?.toISOString(),
      new Date(now.getTime() + 15 * 60 * 1000).toISOString()
    );
  });

  it("verifies email through a consumable token", async () => {
    const repository = new FakeAuthRepository();

    repository.consumableToken = { userId: "user-1" };

    const service = createAuthService({
      repository,
      passwordHasher: passwordHasher(),
      sessionTokens: sessionTokens(),
      sessionTtlDays: 30,
      now: () => now
    });

    const result = await service.verifyEmail("a-valid-raw-token-value");

    assert.equal(result.ok, true);
    assert.equal(repository.verifiedUserId, "user-1");
  });

  it("rejects an invalid or expired verification token", async () => {
    const service = createAuthService({
      repository: new FakeAuthRepository(),
      passwordHasher: passwordHasher(),
      sessionTokens: sessionTokens(),
      sessionTtlDays: 30,
      now: () => now
    });

    const result = await service.verifyEmail("bogus-token-value-here");

    assert.deepEqual(result, { ok: false, reason: "invalid_token" });
  });

  it("resets the password and revokes every session", async () => {
    const repository = new FakeAuthRepository();

    repository.consumableToken = { userId: "user-1" };

    const service = createAuthService({
      repository,
      passwordHasher: passwordHasher(),
      sessionTokens: sessionTokens(),
      sessionTtlDays: 30,
      now: () => now
    });

    const result = await service.resetPassword("a-valid-raw-token-value", "brand-new-secret");

    assert.equal(result.ok, true);
    assert.equal(repository.updatedPasswordHash, "hashed:brand-new-secret");
    assert.equal(repository.revokedAllForUserId, "user-1");
  });

  it("reports success for unknown emails on password reset requests", async () => {
    const service = createAuthService({
      repository: new FakeAuthRepository(null),
      passwordHasher: passwordHasher(),
      sessionTokens: sessionTokens(),
      sessionTtlDays: 30,
      now: () => now
    });

    const result = await service.requestPasswordReset("ghost@example.com");

    assert.deepEqual(result, { requested: true });
  });

  it("keeps the public password-reset response generic when delivery fails", async () => {
    const repository = new FakeAuthRepository();
    let loggedFailures = 0;
    const service = createAuthService({
      repository,
      passwordHasher: passwordHasher(),
      sessionTokens: sessionTokens(),
      sessionTtlDays: 30,
      mailer: { async send() { throw new Error("provider unavailable"); } },
      logger: {
        info() {},
        warn() {},
        error() { loggedFailures += 1; }
      },
      now: () => now
    });

    const result = await service.requestPasswordReset("jan@example.com");

    assert.deepEqual(result, { requested: true });
    assert.equal(repository.createdActionTokens[0]?.purpose, "password_reset");
    assert.equal(loggedFailures, 1);
  });
});
