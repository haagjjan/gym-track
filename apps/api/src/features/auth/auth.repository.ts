import { sql, type Kysely } from "kysely";
import type { AppDatabase } from "../../db/database.js";

export interface AuthUserRecord {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  emailVerifiedAt: Date | null;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  role?: "USER" | "ADMIN";
  accountStatus?: "ACTIVE" | "DELETION_PENDING" | "SUSPENDED";
  betaCohort?: string | null;
  createdAt: Date;
}

export interface NewAuthUser {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  termsVersion?: string | undefined;
  privacyVersion?: string | undefined;
  adultAttestedAt?: Date | undefined;
}

export interface NewAuthSession {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export type ActionTokenPurpose = "email_verification" | "password_reset";

export interface NewActionToken {
  id: string;
  userId: string;
  purpose: ActionTokenPurpose;
  tokenHash: string;
  expiresAt: Date;
}

export type CreateUserWithSessionResult =
  | { status: "created"; user: AuthUserRecord }
  | { status: "conflict" };

const userColumns = [
  "users.id as id",
  "users.email as email",
  "users.username as username",
  "users.password_hash as passwordHash",
  "users.email_verified_at as emailVerifiedAt",
  "users.failed_login_attempts as failedLoginAttempts",
  "users.locked_until as lockedUntil",
  "users.role as role",
  "users.account_status as accountStatus",
  "users.beta_cohort as betaCohort",
  "users.created_at as createdAt"
] as const;

export interface AuthRepository {
  createUserWithSession(
    user: NewAuthUser,
    session: NewAuthSession
  ): Promise<CreateUserWithSessionResult>;
  createInvitedUserWithSession?(
    user: NewAuthUser,
    session: NewAuthSession,
    invitationTokenHash: string,
    now: Date
  ): Promise<CreateUserWithSessionResult | { status: "invalid_invitation" }>;
  createSession(session: NewAuthSession): Promise<void>;
  findUserByUsername(username: string): Promise<AuthUserRecord | null>;
  findUserByEmail(email: string): Promise<AuthUserRecord | null>;
  findUserById(userId: string): Promise<AuthUserRecord | null>;
  findUserBySessionTokenHash(tokenHash: string, now: Date): Promise<AuthUserRecord | null>;
  revokeSession(tokenHash: string, revokedAt: Date): Promise<void>;
  revokeAllSessionsForUser(userId: string, revokedAt: Date): Promise<void>;
  registerFailedLogin(userId: string, now: Date): Promise<number>;
  lockUser(userId: string, lockedUntil: Date): Promise<void>;
  clearLoginFailures(userId: string): Promise<void>;
  incrementLoginCount?(userId: string, updatedAt: Date): Promise<void>;
  markEmailVerified(userId: string, verifiedAt: Date): Promise<void>;
  updatePassword(userId: string, passwordHash: string, updatedAt: Date): Promise<void>;
  createActionToken(token: NewActionToken): Promise<void>;
  consumeActionToken(
    tokenHash: string,
    purpose: ActionTokenPurpose,
    now: Date
  ): Promise<{ userId: string } | null>;
  deleteExpiredAuthRecords(cutoff: Date): Promise<void>;
}

export function createAuthRepository(db: Kysely<AppDatabase>): AuthRepository {
  return {
    async createUserWithSession(user, session) {
      try {
        const createdUser = await db.transaction().execute(async (trx) => {
          const insertedUser = await trx
            .insertInto("users")
            .values({
              id: user.id,
              email: user.email,
              username: user.username,
              password_hash: user.passwordHash,
              terms_version: user.termsVersion ?? null,
              privacy_version: user.privacyVersion ?? null,
              policy_accepted_at: user.termsVersion && user.privacyVersion ? new Date() : null,
              adult_attested_at: user.adultAttestedAt ?? null
            })
            .returning([
              "id",
              "email",
              "username",
              "password_hash as passwordHash",
              "email_verified_at as emailVerifiedAt",
              "failed_login_attempts as failedLoginAttempts",
              "locked_until as lockedUntil",
              "role as role",
              "account_status as accountStatus",
              "beta_cohort as betaCohort",
              "created_at as createdAt"
            ])
            .executeTakeFirstOrThrow();

          await trx
            .insertInto("user_sessions")
            .values({
              id: session.id,
              user_id: session.userId,
              session_token_hash: session.tokenHash,
              expires_at: session.expiresAt
            })
            .execute();

          return insertedUser;
        });

        return {
          status: "created",
          user: createdUser
        };
      } catch (error) {
        if (isUniqueViolation(error)) {
          return { status: "conflict" };
        }

        throw error;
      }
    },
    async createInvitedUserWithSession(user, session, invitationTokenHash, now) {
      try {
        return await db.transaction().execute(async (trx) => {
          const invitation = await trx
            .selectFrom("beta_access_requests")
            .select(["id", "email"])
            .where("invitation_token_hash", "=", invitationTokenHash)
            .where("status", "=", "INVITED")
            .where("invitation_used_at", "is", null)
            .where("invitation_expires_at", ">", now)
            .forUpdate()
            .executeTakeFirst();

          if (!invitation || invitation.email.toLowerCase() !== user.email.toLowerCase()) {
            return { status: "invalid_invitation" } as const;
          }

          const insertedUser = await trx
            .insertInto("users")
            .values({
              id: user.id,
              email: user.email,
              username: user.username,
              password_hash: user.passwordHash,
              email_verified_at: now,
              beta_cohort: "FOUNDING_BETA_2026",
              terms_version: user.termsVersion ?? null,
              privacy_version: user.privacyVersion ?? null,
              policy_accepted_at: now,
              adult_attested_at: user.adultAttestedAt ?? now
            })
            .returning([
              "id",
              "email",
              "username",
              "password_hash as passwordHash",
              "email_verified_at as emailVerifiedAt",
              "failed_login_attempts as failedLoginAttempts",
              "locked_until as lockedUntil",
              "role as role",
              "account_status as accountStatus",
              "beta_cohort as betaCohort",
              "created_at as createdAt"
            ])
            .executeTakeFirstOrThrow();

          await trx.insertInto("user_sessions").values({
            id: session.id,
            user_id: session.userId,
            session_token_hash: session.tokenHash,
            expires_at: session.expiresAt
          }).execute();
          await trx.updateTable("beta_access_requests").set({
            status: "JOINED",
            joined_user_id: user.id,
            invitation_used_at: now,
            invitation_token_hash: null,
            invitation_expires_at: null
          }).where("id", "=", invitation.id).execute();

          return { status: "created", user: insertedUser } as const;
        });
      } catch (error) {
        if (isUniqueViolation(error)) return { status: "conflict" };
        throw error;
      }
    },
    async createSession(session) {
      await db
        .insertInto("user_sessions")
        .values({
          id: session.id,
          user_id: session.userId,
          session_token_hash: session.tokenHash,
          expires_at: session.expiresAt
        })
        .execute();
    },
    async findUserByUsername(username) {
      const user = await db
        .selectFrom("users")
        .select(userColumns)
        .where(sql<string>`lower(username)`, "=", username.toLowerCase())
        .executeTakeFirst();

      return user ?? null;
    },
    async findUserByEmail(email) {
      const user = await db
        .selectFrom("users")
        .select(userColumns)
        .where(sql<string>`lower(email)`, "=", email.toLowerCase())
        .executeTakeFirst();

      return user ?? null;
    },
    async findUserById(userId) {
      const user = await db
        .selectFrom("users")
        .select(userColumns)
        .where("id", "=", userId)
        .executeTakeFirst();

      return user ?? null;
    },
    async findUserBySessionTokenHash(tokenHash, now) {
      const user = await db
        .selectFrom("user_sessions")
        .innerJoin("users", "users.id", "user_sessions.user_id")
        .select(userColumns)
        .where("user_sessions.session_token_hash", "=", tokenHash)
        .where("user_sessions.revoked_at", "is", null)
        .where("user_sessions.expires_at", ">", now)
        .executeTakeFirst();

      return user ?? null;
    },
    async revokeSession(tokenHash, revokedAt) {
      await db
        .updateTable("user_sessions")
        .set({ revoked_at: revokedAt })
        .where("session_token_hash", "=", tokenHash)
        .where("revoked_at", "is", null)
        .execute();
    },
    async revokeAllSessionsForUser(userId, revokedAt) {
      await db
        .updateTable("user_sessions")
        .set({ revoked_at: revokedAt })
        .where("user_id", "=", userId)
        .where("revoked_at", "is", null)
        .execute();
    },
    async registerFailedLogin(userId) {
      const updated = await db
        .updateTable("users")
        .set((eb) => ({
          failed_login_attempts: eb("failed_login_attempts", "+", 1)
        }))
        .where("id", "=", userId)
        .returning("failed_login_attempts as failedLoginAttempts")
        .executeTakeFirst();

      return updated?.failedLoginAttempts ?? 0;
    },
    async lockUser(userId, lockedUntil) {
      await db
        .updateTable("users")
        .set({ locked_until: lockedUntil, failed_login_attempts: 0 })
        .where("id", "=", userId)
        .execute();
    },
    async clearLoginFailures(userId) {
      await db
        .updateTable("users")
        .set({ failed_login_attempts: 0, locked_until: null })
        .where("id", "=", userId)
        .execute();
    },
    async incrementLoginCount(userId, updatedAt) {
      await db.updateTable("users").set((eb) => ({
        login_count: eb("login_count", "+", 1),
        updated_at: updatedAt
      })).where("id", "=", userId).execute();
    },
    async markEmailVerified(userId, verifiedAt) {
      await db
        .updateTable("users")
        .set({ email_verified_at: verifiedAt, updated_at: verifiedAt })
        .where("id", "=", userId)
        .where("email_verified_at", "is", null)
        .execute();
    },
    async updatePassword(userId, passwordHash, updatedAt) {
      await db
        .updateTable("users")
        .set({ password_hash: passwordHash, updated_at: updatedAt })
        .where("id", "=", userId)
        .execute();
    },
    async createActionToken(token) {
      await db
        .insertInto("auth_action_tokens")
        .values({
          id: token.id,
          user_id: token.userId,
          purpose: token.purpose,
          token_hash: token.tokenHash,
          expires_at: token.expiresAt
        })
        .execute();
    },
    async consumeActionToken(tokenHash, purpose, now) {
      const consumed = await db
        .updateTable("auth_action_tokens")
        .set({ used_at: now })
        .where("token_hash", "=", tokenHash)
        .where("purpose", "=", purpose)
        .where("used_at", "is", null)
        .where("expires_at", ">", now)
        .returning("user_id as userId")
        .executeTakeFirst();

      return consumed ?? null;
    },
    async deleteExpiredAuthRecords(cutoff) {
      await db.deleteFrom("user_sessions").where("expires_at", "<", cutoff).execute();
      await db.deleteFrom("auth_action_tokens").where("expires_at", "<", cutoff).execute();
    }
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}
