import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  AuthRepository,
  AuthUserRecord,
  CreateUserWithSessionResult,
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
    createdAt,
    ...overrides
  };
}

function passwordHasher(matches = true): PasswordHasher {
  return {
    async hash(password) {
      return `hashed:${password}`;
    },
    async verify() {
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

  public async findUserBySessionTokenHash(): Promise<AuthUserRecord | null> {
    return this.existingUser;
  }

  public async revokeSession(tokenHash: string): Promise<void> {
    this.revokedTokenHash = tokenHash;
  }
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

  it("rejects invalid login credentials", async () => {
    const service = createAuthService({
      repository: new FakeAuthRepository(),
      passwordHasher: passwordHasher(false),
      sessionTokens: sessionTokens(),
      sessionTtlDays: 30,
      now: () => now
    });

    const result = await service.login({
      username: "jan",
      password: "bad-password"
    });

    assert.deepEqual(result, { ok: false, reason: "invalid_credentials" });
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
});
