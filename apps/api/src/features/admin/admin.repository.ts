import type { Kysely } from "kysely";
import type { AppDatabase } from "../../db/database.js";
import type { AdminAccountStatus } from "./admin.schemas.js";

export interface AdminUserRecord {
  id: string;
  email: string;
  username: string;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "DELETION_PENDING" | "SUSPENDED";
  createdAt: Date;
  activeSessionCount: number;
  emailVerified: boolean;
  lastActiveAt: Date | null;
  completedWorkoutCount: number;
  lastWorkoutAt: Date | null;
}

/** Exact counts for the admin overview. Admin-only, so no privacy thresholds. */
export interface AdminOverviewCounts {
  totalAccounts: number;
  activeAccounts: number;
  suspendedAccounts: number;
  deletionPendingAccounts: number;
  unverifiedEmails: number;
  signupsLast7Days: number;
  signupsLast30Days: number;
  activeUsersLast7Days: number;
  activeUsersLast30Days: number;
  activeSessions: number;
  workoutsCompletedTotal: number;
  workoutsCompletedLast7Days: number;
  setsLoggedLast7Days: number;
}

export interface AdminSettingsRecord {
  campaignsOpen: boolean;
  updatedAt: Date;
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
  getOverview(now: Date): Promise<AdminOverviewCounts>;
  getSettings(): Promise<AdminSettingsRecord>;
  setCampaignsOpen(adminUserId: string, open: boolean, now: Date): Promise<AdminSettingsRecord>;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function createAdminRepository(db: Kysely<AppDatabase>): AdminRepository {
  return {
    async listUsers(now) {
      const rows = await db.selectFrom("users").select([
        "users.id", "users.email", "users.username", "users.role",
        "users.account_status as status",
        "users.created_at as createdAt",
        "users.email_verified_at as emailVerifiedAt",
        "users.completed_workout_count as completedWorkoutCount"
      ]).select((eb) => eb.selectFrom("user_sessions")
        .select((sessionEb) => sessionEb.fn.countAll<string>().as("count"))
        .whereRef("user_sessions.user_id", "=", "users.id")
        .where("user_sessions.revoked_at", "is", null)
        .where("user_sessions.expires_at", ">", now)
        .as("activeSessionCount"))
        .select((eb) => eb.selectFrom("user_sessions")
          .select((sessionEb) => sessionEb.fn.max(sessionEb.fn.coalesce("user_sessions.last_used_at", "user_sessions.created_at")).as("lastActive"))
          .whereRef("user_sessions.user_id", "=", "users.id")
          .as("lastActiveAt"))
        .select((eb) => eb.selectFrom("workout_sessions")
          .select((workoutEb) => workoutEb.fn.max("workout_sessions.ended_at").as("lastWorkout"))
          .whereRef("workout_sessions.user_id", "=", "users.id")
          .where("workout_sessions.deleted_at", "is", null)
          .as("lastWorkoutAt"))
        .orderBy("users.created_at", "desc").limit(500).execute();
      return rows.map(({ emailVerifiedAt, ...row }) => ({
        ...row,
        activeSessionCount: Number(row.activeSessionCount),
        completedWorkoutCount: Number(row.completedWorkoutCount),
        emailVerified: emailVerifiedAt !== null,
        lastActiveAt: toDateOrNull(row.lastActiveAt),
        lastWorkoutAt: toDateOrNull(row.lastWorkoutAt)
      }));
    },
    async getOverview(now) {
      const week = new Date(now.getTime() - 7 * DAY_MS);
      const month = new Date(now.getTime() - 30 * DAY_MS);
      const [users, active, sessions, workouts, sets] = await Promise.all([
        db.selectFrom("users").select((eb) => [
          eb.fn.countAll<string>().as("total"),
          eb.fn.countAll<string>().filterWhere("account_status", "=", "ACTIVE").as("active"),
          eb.fn.countAll<string>().filterWhere("account_status", "=", "SUSPENDED").as("suspended"),
          eb.fn.countAll<string>().filterWhere("account_status", "=", "DELETION_PENDING").as("deletionPending"),
          eb.fn.countAll<string>().filterWhere("email_verified_at", "is", null).as("unverified"),
          eb.fn.countAll<string>().filterWhere("created_at", ">=", week).as("signups7"),
          eb.fn.countAll<string>().filterWhere("created_at", ">=", month).as("signups30")
        ]).executeTakeFirstOrThrow(),
        db.selectFrom("user_sessions").select((eb) => [
          eb.fn.count<string>("user_id").distinct().filterWhere(eb.fn.coalesce("last_used_at", "created_at"), ">=", week).as("active7"),
          eb.fn.count<string>("user_id").distinct().filterWhere(eb.fn.coalesce("last_used_at", "created_at"), ">=", month).as("active30")
        ]).executeTakeFirstOrThrow(),
        db.selectFrom("user_sessions").select((eb) => eb.fn.countAll<string>().as("count"))
          .where("revoked_at", "is", null).where("expires_at", ">", now).executeTakeFirstOrThrow(),
        db.selectFrom("workout_sessions").select((eb) => [
          eb.fn.countAll<string>().as("total"),
          eb.fn.countAll<string>().filterWhere("ended_at", ">=", week).as("last7")
        ]).where("deleted_at", "is", null).where("ended_at", "is not", null).executeTakeFirstOrThrow(),
        db.selectFrom("sets").select((eb) => eb.fn.countAll<string>().as("count"))
          .where("deleted_at", "is", null).where("created_at", ">=", week).executeTakeFirstOrThrow()
      ]);
      return {
        totalAccounts: Number(users.total),
        activeAccounts: Number(users.active),
        suspendedAccounts: Number(users.suspended),
        deletionPendingAccounts: Number(users.deletionPending),
        unverifiedEmails: Number(users.unverified),
        signupsLast7Days: Number(users.signups7),
        signupsLast30Days: Number(users.signups30),
        activeUsersLast7Days: Number(active.active7),
        activeUsersLast30Days: Number(active.active30),
        activeSessions: Number(sessions.count),
        workoutsCompletedTotal: Number(workouts.total),
        workoutsCompletedLast7Days: Number(workouts.last7),
        setsLoggedLast7Days: Number(sets.count)
      };
    },
    async getSettings() {
      const row = await db.selectFrom("beta_settings")
        .select(["campaigns_open as campaignsOpen", "updated_at as updatedAt"])
        .where("singleton", "=", true).executeTakeFirstOrThrow();
      return { campaignsOpen: row.campaignsOpen, updatedAt: new Date(row.updatedAt) };
    },
    async setCampaignsOpen(adminUserId, open, now) {
      // The runtime switch still lives in the legacy beta_settings row (ADR 0022 defers the drop).
      await db.transaction().execute(async (trx) => {
        await trx.updateTable("beta_settings")
          .set({ campaigns_open: open, updated_at: now, updated_by_user_id: adminUserId })
          .where("singleton", "=", true).execute();
        await trx.insertInto("admin_audit_events").values({
          admin_user_id: adminUserId,
          action: open ? "CAMPAIGNS_OPENED" : "CAMPAIGNS_PAUSED",
          target_type: "SETTINGS",
          target_id: "campaigns",
          details: "{}",
          created_at: now
        }).execute();
      });
      return this.getSettings();
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

function toDateOrNull(value: Date | string | null | undefined): Date | null {
  return value === null || value === undefined ? null : new Date(value);
}
