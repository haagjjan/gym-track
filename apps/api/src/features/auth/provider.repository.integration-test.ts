import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, describe, it } from "node:test";
import { createDatabase } from "../../db/database.js";
import { createProviderRepository } from "./provider.repository.js";
import { createAuthRepository } from "./auth.repository.js";

const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
describe("provider identity persistence", { skip: databaseUrl ? false : "INTEGRATION_DATABASE_URL is not set" }, () => {
  const db = createDatabase(databaseUrl ?? "postgresql://unused");
  const repository = createProviderRepository(db);
  const ids: string[] = [];
  after(async () => {
    if (ids.length) {
      await db.deleteFrom("user_sessions").where("user_id", "in", ids).execute();
      await db.deleteFrom("users").where("id", "in", ids).execute();
    }
    await db.destroy();
  });
  async function account(subject = randomUUID()) {
    const id = randomUUID(); ids.push(id);
    const identity = { provider: "apple" as const, subject, email: `${id}@example.test`, emailVerified: true };
    const session = { id: randomUUID(), userId: id, tokenHash: randomUUID(), expiresAt: new Date(Date.now() + 60000) };
    const result = await repository.createAccount({
      id, email: identity.email, username: id, passwordHash: null,
      emailVerifiedAt: new Date(), termsVersion: "v1", privacyVersion: "v1", adultAttestedAt: new Date()
    }, session, identity);
    return { id, identity, session, result };
  }
  it("atomically creates passwordless user, identity, policy evidence and session", async () => {
    const { id, identity, session, result } = await account();
    assert.equal(result.status, "created");
    const user = await createAuthRepository(db).findUserBySessionTokenHash(session.tokenHash, new Date());
    assert.equal(user?.id, id);
    assert.equal(user?.passwordHash, null);
    assert.ok(user?.emailVerifiedAt);
    assert.equal((await repository.findIdentity(identity))?.id, id);
    const policy = await db.selectFrom("users").select(["terms_version", "privacy_version", "adult_attested_at", "policy_accepted_at"])
      .where("id", "=", id).executeTakeFirstOrThrow();
    assert.equal(policy.terms_version, "v1");
    assert.ok(policy.adult_attested_at);
    assert.ok(policy.policy_accepted_at);
  });
  it("identity uniqueness rolls back the whole signup", async () => {
    const first = await account();
    const second = await account(first.identity.subject);
    assert.equal(second.result.status, "conflict");
    assert.equal(await createAuthRepository(db).findUserById(second.id), null);
    assert.equal(await createAuthRepository(db).findUserBySessionTokenHash(second.session.tokenHash, new Date()), null);
  });
  it("links idempotently, rejects another owner, and protects the last sign-in method", async () => {
    const first = await account(); const second = await account();
    assert.equal(await repository.link(first.id, first.identity), true);
    assert.equal(await repository.link(second.id, first.identity), false);
    assert.equal(await repository.unlink(first.id, "apple"), false);
    const google = { ...first.identity, provider: "google" as const };
    assert.equal(await repository.link(first.id, google), true);
    assert.equal(await repository.unlink(first.id, "apple"), true);
    assert.equal(await repository.unlink(first.id, "google"), false);
    await createAuthRepository(db).updatePassword(first.id, "password-hash", new Date());
    assert.equal(await repository.unlink(first.id, "google"), true);
  });
  it("serializes concurrent unlink attempts and cascades on user deletion", async () => {
    const first = await account();
    await repository.link(first.id, { ...first.identity, provider: "google" });
    const results = await Promise.all([repository.unlink(first.id, "apple"), repository.unlink(first.id, "google")]);
    assert.deepEqual(results.sort(), [false, true]);
    assert.equal((await repository.list(first.id)).length, 1);
    await db.deleteFrom("user_sessions").where("user_id", "=", first.id).execute();
    await db.deleteFrom("users").where("id", "=", first.id).execute();
    assert.deepEqual(await repository.list(first.id), []);
  });
});
