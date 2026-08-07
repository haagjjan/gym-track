import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Mailer } from "../../shared/mailer.js";
import type { PasswordHasher } from "../auth/password.js";
import type { SessionTokenGenerator } from "../auth/session-token.js";
import type { UserAccountRepository } from "./user-account.repository.js";
import {
  AccountEmailDeliveryError,
  createUserAccountService
} from "./user-account.service.js";

const now = new Date("2026-08-06T12:00:00.000Z");

function createRepository(
  overrides: Partial<UserAccountRepository> = {}
): UserAccountRepository {
  return {
    async getCredentials() {
      return {
        id: "user-1",
        email: "person@example.test",
        username: "person",
        passwordHash: "hash",
        accountStatus: "ACTIVE"
      };
    },
    async getPrivacy() { return null; },
    async updatePrivacy() { return null; },
    async getOnboarding() { return null; },
    async updateOnboarding() { return null; },
    async exportAccount() { return {}; },
    async requestDeletion() { return true; },
    async cancelDeletion() { return { email: "person@example.test" }; },
    async cancelDeletionByAdmin() { return { email: "person@example.test" }; },
    async listDueDeletions() { return []; },
    async finalizeDeletion() { return true; },
    async cleanupRetention() {},
    ...overrides
  };
}

const passwordHasher: PasswordHasher = {
  async hash(value) { return value; },
  async verify() { return true; }
};

const tokens: SessionTokenGenerator = {
  create() { return { rawToken: "raw-token", tokenHash: "hashed-token" }; },
  hash(value) { return `hashed:${value}`; }
};

function createService(repository: UserAccountRepository, mailer: Mailer) {
  return createUserAccountService({
    repository,
    passwordHasher,
    tokens,
    mailer,
    appBaseUrl: "https://app.example.test",
    supportEmail: "support@example.test",
    now: () => now
  });
}

describe("user account email delivery", () => {
  it("compensates a deletion request when required delivery fails", async () => {
    let cancelledHash: string | null = null;
    const repository = createRepository({
      async cancelDeletion(tokenHash) {
        cancelledHash = tokenHash;
        return { email: "person@example.test" };
      }
    });
    const service = createService(repository, {
      async send() { throw new Error("provider unavailable"); }
    });

    await assert.rejects(
      () => service.requestDeletion("user-1", "password"),
      AccountEmailDeliveryError
    );
    assert.equal(cancelledHash, "hashed-token");
  });

  it("keeps a successful cancellation when its notification fails", async () => {
    const service = createService(createRepository(), {
      async send() { throw new Error("provider unavailable"); }
    });

    assert.deepEqual(await service.cancelDeletion("raw-token"), {
      cancelled: true,
      notificationStatus: "FAILED"
    });
  });

  it("continues all due deletions after a completion notification fails", async () => {
    const finalized: string[] = [];
    let deliveryAttempt = 0;
    const repository = createRepository({
      async listDueDeletions() {
        return [
          { id: "user-1", email: "one@example.test" },
          { id: "user-2", email: "two@example.test" }
        ];
      },
      async finalizeDeletion(userId) {
        finalized.push(userId);
        return true;
      }
    });
    const service = createService(repository, {
      async send() {
        deliveryAttempt += 1;
        if (deliveryAttempt === 1) throw new Error("provider unavailable");
        return { provider: "resend" };
      }
    });

    assert.deepEqual(await service.cleanupDeletions(), {
      due: 2,
      finalized: 2,
      deletionFailures: 0,
      notificationFailures: 1
    });
    assert.deepEqual(finalized, ["user-1", "user-2"]);
  });
});
