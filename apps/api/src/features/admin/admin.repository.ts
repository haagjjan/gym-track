import type { Kysely } from "kysely";
import type { AppDatabase } from "../../db/database.js";
import type { AdminAccountStatus } from "./admin.schemas.js";

export interface AdminUserRecord {
  id: string;
  email: string;
  username: string;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "DELETION_PENDING" | "SUSPENDED";
  cohort: string | null;
  createdAt: Date;
  activeSessionCount: number;
}

export interface AdminAuditCursor {
  createdAt: Date;
  id: string;
}

export interface AdminAuditRecord {
  id: string;
  adminUserId: string | null;
  adminUsername: string | null;
  action: string;
  targetType: string;
  targetId: string;
  details: unknown;
  createdAt: Date;
}

export type AdminMutationResult =
  | { status: "updated"; accountStatus: AdminAccountStatus; revokedSessions: number }
  | { status: "not_found" | "forbidden" | "invalid_transition" };

export type AdminSessionRevocationResult =
  | { status: "updated"; revokedSessions: number }
  | { status: "not_found" | "forbidden" };

export interface AdminRepository {
  listUsers(now: Date): Promise<AdminUserRecord[]>;
  setUserStatus(adminUserId: string, userId: string, status: AdminAccountStatus, now: Date): Promise<AdminMutationResult>;
  revokeUserSessions(adminUserId: string, userId: string, now: Date): Promise<AdminSessionRevocationResult>;
  listAuditEvents(cursor: AdminAuditCursor | undefined, limit: number): Promise<AdminAuditRecord[]>;
}

export function createAdminRepository(db: Kysely<AppDatabase>): AdminRepository {
  return {
    async listUsers(now) {
      const rows = await db.selectFrom("users").select([
        "users.id", "users.email", "users.username", "users.role",
        "users.account_status as status", "users.beta_cohort as cohort",
        "users.created_at as createdAt"
      ]).select((eb) => eb.selectFrom("user_sessions")
        .select((sessionEb) => sessionEb.fn.countAll<string>().as("count"))
        .whereRef("user_sessions.user_id", "=", "users.id")
        .where("user_sessions.revoked_at", "is", null)
        .where("user_sessions.expires_at", ">", now)
        .as("activeSessionCount"))
        .orderBy("users.created_at", "desc").limit(500).execute();
      return rows.map((row) => ({ ...row, activeSessionCount: Number(row.activeSessionCount) }));
    },

    async setUserStatus(adminUserId, userId, status, now) {
      return db.transaction().execute(async (trx) => {
        const target = await lockTarget(trx, userId);
        if (!target) return { status: "not_found" } as const;
        if (target.role === "ADMIN" || target.id === adminUserId) return { status: "forbidden" } as const;
        if (target.accountStatus === "DELETION_PENDING" || target.accountStatus === status) {
          return { status: "invalid_transition" } as const;
        }

        let revokedSessions = 0;
        if (status === "SUSPENDED") revokedSessions = await revokeSessions(trx, userId, now);
        await trx.updateTable("users").set({ account_status: status, updated_at: now })
          .where("id", "=", userId).execute();
        await insertAudit(trx, {
          adminUserId,
          action: status === "SUSPENDED" ? "USER_SUSPENDED" : "USER_REACTIVATED",
          targetId: userId,
          details: { previousStatus: target.accountStatus, newStatus: status, revokedSessions },
          now
        });
        return { status: "updated", accountStatus: status, revokedSessions } as const;
      });
    },

    async revokeUserSessions(adminUserId, userId, now) {
      return db.transaction().execute(async (trx) => {
        const target = await lockTarget(trx, userId);
        if (!target) return { status: "not_found" } as const;
        if (target.role === "ADMIN" || target.id === adminUserId) return { status: "forbidden" } as const;
        const revokedSessions = await revokeSessions(trx, userId, now);
        await insertAudit(trx, {
          adminUserId,
          action: "USER_SESSIONS_REVOKED",
          targetId: userId,
          details: { revokedSessions },
          now
        });
        return { status: "updated", revokedSessions } as const;
      });
    },

    async listAuditEvents(cursor, limit) {
      let query = db.selectFrom("admin_audit_events")
        .leftJoin("users as admin", "admin.id", "admin_audit_events.admin_user_id")
        .select([
          "admin_audit_events.id", "admin_audit_events.admin_user_id as adminUserId",
          "admin.username as adminUsername", "admin_audit_events.action",
          "admin_audit_events.target_type as targetType", "admin_audit_events.target_id as targetId",
          "admin_audit_events.details", "admin_audit_events.created_at as createdAt"
        ]);
      if (cursor) {
        query = query.where((eb) => eb.or([
          eb("admin_audit_events.created_at", "<", cursor.createdAt),
          eb.and([
            eb("admin_audit_events.created_at", "=", cursor.createdAt),
            eb("admin_audit_events.id", "<", cursor.id)
          ])
        ]));
      }
      return query.orderBy("admin_audit_events.created_at", "desc")
        .orderBy("admin_audit_events.id", "desc").limit(limit).execute();
    }
  };
}

async function lockTarget(db: Kysely<AppDatabase>, userId: string) {
  return db.selectFrom("users").select([
    "id", "role", "account_status as accountStatus"
  ]).where("id", "=", userId).forUpdate().executeTakeFirst();
}

async function revokeSessions(db: Kysely<AppDatabase>, userId: string, now: Date): Promise<number> {
  const result = await db.updateTable("user_sessions").set({ revoked_at: now })
    .where("user_id", "=", userId).where("revoked_at", "is", null).executeTakeFirst();
  return Number(result.numUpdatedRows);
}

async function insertAudit(db: Kysely<AppDatabase>, input: {
  adminUserId: string;
  action: string;
  targetId: string;
  details: Record<string, string | number>;
  now: Date;
}): Promise<void> {
  await db.insertInto("admin_audit_events").values({
    admin_user_id: input.adminUserId,
    action: input.action,
    target_type: "USER",
    target_id: input.targetId,
    details: JSON.stringify(input.details),
    created_at: input.now
  }).execute();
}
