import { randomUUID } from "node:crypto";
import type { Kysely } from "kysely";
import type { AppDatabase } from "../../db/database.js";
import { createAuthRepository, type NewAuthSession, type NewAuthUser } from "./auth.repository.js";
import type { Provider, ProviderIdentity } from "./provider-token.js";

export function createProviderRepository(db: Kysely<AppDatabase>) {
  const auth = createAuthRepository(db);
  return {
    async findIdentity(identity: ProviderIdentity) {
      const row = await db.selectFrom("user_identities").select("user_id")
        .where("provider", "=", identity.provider).where("provider_subject", "=", identity.subject).executeTakeFirst();
      return row ? auth.findUserById(row.user_id) : null;
    },
    findByEmail: auth.findUserByEmail,
    createAccount: (user: NewAuthUser, session: NewAuthSession, identity: ProviderIdentity) =>
      auth.createUserWithSession(user, session, identity),
    async list(userId: string) {
      return db.selectFrom("user_identities").select(["provider", "created_at"])
        .where("user_id", "=", userId).orderBy("created_at").execute();
    },
    async link(userId: string, identity: ProviderIdentity): Promise<boolean> {
      return db.transaction().execute(async (trx) => {
        await trx.selectFrom("users").select("id").where("id", "=", userId).forUpdate().executeTakeFirstOrThrow();
        await trx.insertInto("user_identities").values({
          id: randomUUID(), user_id: userId, provider: identity.provider,
          provider_subject: identity.subject, email_at_link: identity.email
        }).onConflict((oc) => oc.columns(["provider", "provider_subject"]).doNothing()).execute();
        const row = await trx.selectFrom("user_identities").select("user_id")
          .where("provider", "=", identity.provider).where("provider_subject", "=", identity.subject).executeTakeFirstOrThrow();
        return row.user_id === userId;
      });
    },
    async unlink(userId: string, provider: Provider): Promise<boolean> {
      return db.transaction().execute(async (trx) => {
        const user = await trx.selectFrom("users").select("password_hash")
          .where("id", "=", userId).forUpdate().executeTakeFirstOrThrow();
        const identities = await trx.selectFrom("user_identities").select("provider")
          .where("user_id", "=", userId).execute();
        if (user.password_hash === null && !identities.some((identity) => identity.provider !== provider)) return false;
        await trx.deleteFrom("user_identities").where("user_id", "=", userId).where("provider", "=", provider).execute();
        return true;
      });
    }
  };
}

export type ProviderRepository = ReturnType<typeof createProviderRepository>;
