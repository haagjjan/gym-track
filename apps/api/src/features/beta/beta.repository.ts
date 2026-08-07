import { sql, type Kysely } from "kysely";
import type { AppDatabase } from "../../db/database.js";
import type { BetaSettingsUpdate, WaitlistRequest } from "./beta.schemas.js";

export interface BetaSettings {
  waitlistOpen: boolean;
  invitationsOpen: boolean;
  campaignsOpen: boolean;
  accountCap: number;
  dailyApprovalLimit: number;
}

export interface BetaRequestRecord {
  id: string;
  email: string;
  status: "PENDING" | "INVITED" | "JOINED" | "EXPIRED" | "BLOCKED";
  requestedAt: Date;
  invitationExpiresAt: Date | null;
}

export type ApproveResult =
  | { status: "approved"; email: string }
  | { status: "not_found" | "paused" | "cap_reached" | "daily_limit_reached" };

export interface BetaRepository {
  getSettings(): Promise<BetaSettings>;
  createRequest(id: string, input: WaitlistRequest, now: Date): Promise<"created" | "existing">;
  listRequests(): Promise<BetaRequestRecord[]>;
  listUsers(): Promise<Array<{ id: string; email: string; username: string; status: string; cohort: string | null }>>;
  approve(
    requestId: string,
    adminUserId: string,
    tokenHash: string,
    expiresAt: Date,
    now: Date,
    countAsApproval: boolean
  ): Promise<ApproveResult>;
  recordInvitationDelivery(
    requestId: string,
    adminUserId: string,
    outcome: "FAILED" | "SENT",
    now: Date
  ): Promise<void>;
  returnToWaitlist(requestId: string, adminUserId: string, now: Date): Promise<boolean>;
  block(requestId: string, adminUserId: string, now: Date): Promise<boolean>;
  updateSettings(adminUserId: string, update: BetaSettingsUpdate, now: Date): Promise<BetaSettings>;
  expireInvitations(now: Date): Promise<void>;
}

const settingsColumns = [
  "waitlist_open as waitlistOpen",
  "invitations_open as invitationsOpen",
  "campaigns_open as campaignsOpen",
  "account_cap as accountCap",
  "daily_approval_limit as dailyApprovalLimit"
] as const;

export function createBetaRepository(db: Kysely<AppDatabase>): BetaRepository {
  return {
    async getSettings() {
      return db.selectFrom("beta_settings").select(settingsColumns)
        .where("singleton", "=", true).executeTakeFirstOrThrow();
    },
    async createRequest(id, input, now) {
      const settings = await this.getSettings();
      if (!settings.waitlistOpen) return "existing";
      const account = await db.selectFrom("users").select("id")
        .where(sql<boolean>`lower(email) = lower(${input.email})`).executeTakeFirst();
      if (account) return "existing";

      const inserted = await db.insertInto("beta_access_requests").values({
        id,
        email: input.email,
        status: "PENDING",
        terms_version: input.termsVersion,
        privacy_version: input.privacyVersion,
        policy_accepted_at: now,
        adult_attested_at: now,
        requested_at: now
      }).onConflict((conflict) => conflict.expression(sql`lower(email)`).doNothing())
        .returning("id").executeTakeFirst();
      return inserted ? "created" : "existing";
    },
    async listRequests() {
      return db.selectFrom("beta_access_requests").select([
        "id", "email", "status", "requested_at as requestedAt",
        "invitation_expires_at as invitationExpiresAt"
      ]).orderBy("requested_at", "desc").limit(500).execute();
    },
    async listUsers() {
      return db.selectFrom("users").select([
        "id", "email", "username", "account_status as status", "beta_cohort as cohort"
      ]).orderBy("created_at", "desc").limit(500).execute();
    },
    async approve(requestId, adminUserId, tokenHash, expiresAt, now, countAsApproval) {
      return db.transaction().execute(async (trx) => {
        const settings = await trx.selectFrom("beta_settings").select(settingsColumns)
          .where("singleton", "=", true).forUpdate().executeTakeFirstOrThrow();
        if (!settings.invitationsOpen) return { status: "paused" } as const;

        const request = await trx.selectFrom("beta_access_requests").select(["id", "email", "status"])
          .where("id", "=", requestId).forUpdate().executeTakeFirst();
        const allowedStates = countAsApproval ? ["PENDING", "EXPIRED"] : ["INVITED"];
        if (!request || !allowedStates.includes(request.status)) return { status: "not_found" } as const;

        if (countAsApproval) {
          const accounts = await trx.selectFrom("users").select((eb) => eb.fn.countAll<string>().as("count"))
            .where("account_status", "in", ["ACTIVE", "DELETION_PENDING", "SUSPENDED"]).executeTakeFirstOrThrow();
          const invitations = await trx.selectFrom("beta_access_requests")
            .select((eb) => eb.fn.countAll<string>().as("count"))
            .where("status", "=", "INVITED").where("invitation_expires_at", ">", now)
            .executeTakeFirstOrThrow();
          if (Number(accounts.count) + Number(invitations.count) >= settings.accountCap) {
            return { status: "cap_reached" } as const;
          }
          const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          const recent = await trx.selectFrom("admin_audit_events")
            .select((eb) => eb.fn.countAll<string>().as("count"))
            .where("action", "=", "BETA_REQUEST_APPROVED")
            .where("created_at", ">=", since).executeTakeFirstOrThrow();
          if (Number(recent.count) >= settings.dailyApprovalLimit) {
            return { status: "daily_limit_reached" } as const;
          }
        }

        await trx.updateTable("beta_access_requests").set({
          status: "INVITED",
          reviewed_at: now,
          reviewed_by_user_id: adminUserId,
          invitation_token_hash: tokenHash,
          invitation_expires_at: expiresAt,
          invitation_used_at: null,
          blocked_at: null
        }).where("id", "=", requestId).execute();
        await insertAudit(trx, adminUserId, countAsApproval ? "BETA_REQUEST_APPROVED" : "BETA_INVITE_REISSUED", requestId, now);
        return { status: "approved", email: request.email } as const;
      });
    },
    async recordInvitationDelivery(requestId, adminUserId, outcome, now) {
      await insertAudit(
        db,
        adminUserId,
        outcome === "SENT" ? "BETA_INVITE_DELIVERED" : "BETA_INVITE_DELIVERY_FAILED",
        requestId,
        now
      );
    },
    async returnToWaitlist(requestId, adminUserId, now) {
      const result = await db.transaction().execute(async (trx) => {
        const updated = await trx.updateTable("beta_access_requests").set({
          status: "PENDING", invitation_token_hash: null, invitation_expires_at: null,
          invitation_used_at: null, reviewed_at: now, reviewed_by_user_id: adminUserId, blocked_at: null
        }).where("id", "=", requestId).where("status", "!=", "JOINED").returning("id").executeTakeFirst();
        if (updated) await insertAudit(trx, adminUserId, "BETA_REQUEST_RETURNED", requestId, now);
        return Boolean(updated);
      });
      return result;
    },
    async block(requestId, adminUserId, now) {
      return db.transaction().execute(async (trx) => {
        const updated = await trx.updateTable("beta_access_requests").set({
          status: "BLOCKED", blocked_at: now, invitation_token_hash: null,
          invitation_expires_at: null, reviewed_at: now, reviewed_by_user_id: adminUserId
        }).where("id", "=", requestId).where("status", "!=", "JOINED").returning("id").executeTakeFirst();
        if (updated) await insertAudit(trx, adminUserId, "BETA_REQUEST_BLOCKED", requestId, now);
        return Boolean(updated);
      });
    },
    async updateSettings(adminUserId, update, now) {
      await db.transaction().execute(async (trx) => {
        await trx.updateTable("beta_settings").set({
          ...(update.waitlistOpen !== undefined ? { waitlist_open: update.waitlistOpen } : {}),
          ...(update.invitationsOpen !== undefined ? { invitations_open: update.invitationsOpen } : {}),
          ...(update.campaignsOpen !== undefined ? { campaigns_open: update.campaignsOpen } : {}),
          ...(update.accountCap !== undefined ? { account_cap: update.accountCap } : {}),
          ...(update.dailyApprovalLimit !== undefined ? { daily_approval_limit: update.dailyApprovalLimit } : {}),
          updated_at: now,
          updated_by_user_id: adminUserId
        }).where("singleton", "=", true).execute();
        await insertAudit(trx, adminUserId, "BETA_SETTINGS_UPDATED", "singleton", now);
      });
      return this.getSettings();
    },
    async expireInvitations(now) {
      await db.updateTable("beta_access_requests").set({
        status: "EXPIRED", invitation_token_hash: null, invitation_expires_at: null
      }).where("status", "=", "INVITED").where("invitation_expires_at", "<=", now).execute();
    }
  };
}

async function insertAudit(
  db: Kysely<AppDatabase>, adminUserId: string, action: string, targetId: string, now: Date
): Promise<void> {
  await db.insertInto("admin_audit_events").values({
    admin_user_id: adminUserId,
    action,
    target_type: "BETA_ACCESS_REQUEST",
    target_id: targetId,
    details: "{}",
    created_at: now
  }).execute();
}
