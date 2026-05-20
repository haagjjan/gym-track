import { sql, type Kysely } from "kysely";
import type { AppDatabase } from "../../db/database.js";

export interface AuthUserRecord {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  createdAt: Date;
}

export interface NewAuthUser {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
}

export interface NewAuthSession {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export type CreateUserWithSessionResult =
  | { status: "created"; user: AuthUserRecord }
  | { status: "conflict" };

export interface AuthRepository {
  createUserWithSession(
    user: NewAuthUser,
    session: NewAuthSession
  ): Promise<CreateUserWithSessionResult>;
  createSession(session: NewAuthSession): Promise<void>;
  findUserByUsername(username: string): Promise<AuthUserRecord | null>;
  findUserBySessionTokenHash(tokenHash: string, now: Date): Promise<AuthUserRecord | null>;
  revokeSession(tokenHash: string, revokedAt: Date): Promise<void>;
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
              password_hash: user.passwordHash
            })
            .returning([
              "id",
              "email",
              "username",
              "password_hash as passwordHash",
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
      const normalizedUsername = username.toLowerCase();

      const user = await db
        .selectFrom("users")
        .select([
          "id",
          "email",
          "username",
          "password_hash as passwordHash",
          "created_at as createdAt"
        ])
        .where(sql<string>`lower(username)`, "=", normalizedUsername)
        .executeTakeFirst();

      return user ?? null;
    },
    async findUserBySessionTokenHash(tokenHash, now) {
      const user = await db
        .selectFrom("user_sessions")
        .innerJoin("users", "users.id", "user_sessions.user_id")
        .select([
          "users.id as id",
          "users.email as email",
          "users.username as username",
          "users.password_hash as passwordHash",
          "users.created_at as createdAt"
        ])
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
