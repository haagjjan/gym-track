import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { createDatabase } from "../../db/database.js";
import { createAuthRepository } from "./auth.repository.js";

const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
const userId = randomUUID();
const prefix = `auth_rotation_${process.pid}_`;

describe("auth action token rotation", {
  skip: databaseUrl ? false : "INTEGRATION_DATABASE_URL is not set"
}, () => {
  const db = createDatabase(databaseUrl ?? "postgresql://unused");
  const repository = createAuthRepository(db);

  before(async () => {
    await cleanup();
    await db.insertInto("users").values({
      id: userId,
      email: `${prefix}person@example.test`,
      username: `${prefix}person`,
      password_hash: "unused"
    }).execute();
  });
  after(async () => { await cleanup(); await db.destroy(); });

  it("rotates unused verification and reset tokens while retaining consumed records", async () => {
    const expiresAt = new Date("2026-08-07T12:00:00.000Z");
    const usedAt = new Date("2026-08-06T12:00:00.000Z");
    await createToken("verification-used", "email_verification", expiresAt);
    assert.deepEqual(
      await repository.consumeActionToken("verification-used", "email_verification", usedAt),
      { userId }
    );

    await createToken("verification-superseded", "email_verification", expiresAt);
    await createToken("verification-current", "email_verification", expiresAt);
    await createToken("reset-superseded", "password_reset", expiresAt);
    await createToken("reset-current", "password_reset", expiresAt);

    const rows = await db.selectFrom("auth_action_tokens")
      .select(["purpose", "token_hash", "used_at"])
      .where("user_id", "=", userId)
      .orderBy("token_hash")
      .execute();

    assert.deepEqual(rows.map((row) => ({
      purpose: row.purpose,
      tokenHash: row.token_hash,
      used: row.used_at !== null
    })), [
      { purpose: "password_reset", tokenHash: "reset-current", used: false },
      { purpose: "email_verification", tokenHash: "verification-current", used: false },
      { purpose: "email_verification", tokenHash: "verification-used", used: true }
    ]);
  });

  async function createToken(
    tokenHash: string,
    purpose: "email_verification" | "password_reset",
    expiresAt: Date
  ): Promise<void> {
    await repository.createActionToken({
      id: randomUUID(),
      userId,
      purpose,
      tokenHash,
      expiresAt
    });
  }

  async function cleanup(): Promise<void> {
    await db.deleteFrom("auth_action_tokens").where("user_id", "=", userId).execute();
    await db.deleteFrom("users").where("id", "=", userId).execute();
  }
});
