import { randomUUID } from "node:crypto";
import type { Kysely } from "kysely";
import type { AppDatabase } from "../../db/database.js";
import type { CreateCampaign, MessageResponse } from "./message.schemas.js";

export interface UserMessage {
  id: string;
  title: string;
  body: string;
  responseType: "ACKNOWLEDGEMENT" | "RATING" | "SINGLE_CHOICE" | "FREE_TEXT";
  responseOptions: string[];
  actionUrl: string | null;
  essential: boolean;
  shownAt: Date | null;
}

export interface MessageRepository {
  createCampaign(adminUserId: string, input: CreateCampaign, now: Date): Promise<{ id: string }>;
  listCampaigns(): Promise<Array<Record<string, unknown>>>;
  setCampaignStatus(adminUserId: string, campaignId: string, action: "PUBLISH" | "PAUSE" | "RESUME" | "END", now: Date): Promise<boolean>;
  listEligibleMessages(userId: string, now: Date): Promise<UserMessage[]>;
  listInboxMessages(userId: string): Promise<Array<UserMessage & { dismissedAt: Date | null; respondedAt: Date | null }>>;
  markShown(userId: string, campaignId: string, now: Date): Promise<void>;
  dismiss(userId: string, campaignId: string, now: Date): Promise<boolean>;
  respond(userId: string, campaignId: string, response: MessageResponse, now: Date): Promise<boolean>;
}

export function createMessageRepository(db: Kysely<AppDatabase>): MessageRepository {
  return {
    async createCampaign(adminUserId, input, now) {
      const id = randomUUID();
      await db.transaction().execute(async (trx) => {
        await trx.insertInto("campaigns").values({
          id, title: input.title, body: input.body, status: "DRAFT", audience_type: input.audienceType,
          trigger_type: input.triggerType, trigger_threshold: input.triggerThreshold, response_type: input.responseType,
          response_options: JSON.stringify(input.responseOptions), action_url: input.actionUrl, essential: input.essential,
          starts_at: input.startsAt, ends_at: input.endsAt, scheduled_at: input.scheduledAt,
          created_by_user_id: adminUserId, created_at: now
        }).execute();
        if (input.audienceType === "SELECTED") await trx.insertInto("campaign_targets").values(
          input.targetUserIds.map((userId) => ({ campaign_id: id, user_id: userId }))
        ).execute();
        await audit(trx, adminUserId, "CAMPAIGN_CREATED", id, now);
      });
      return { id };
    },
    async listCampaigns() {
      return db.selectFrom("campaigns").select([
        "id", "title", "body", "status", "audience_type as audienceType", "trigger_type as triggerType",
        "trigger_threshold as triggerThreshold", "response_type as responseType", "response_options as responseOptions",
        "action_url as actionUrl", "essential", "starts_at as startsAt", "ends_at as endsAt", "scheduled_at as scheduledAt",
        "created_at as createdAt", "published_at as publishedAt", "ended_at as endedAt"
      ]).orderBy("created_at", "desc").limit(200).execute() as Promise<Array<Record<string, unknown>>>;
    },
    async setCampaignStatus(adminUserId, campaignId, action, now) {
      return db.transaction().execute(async (trx) => {
        const campaign = await trx.selectFrom("campaigns").selectAll().where("id", "=", campaignId).forUpdate().executeTakeFirst();
        if (!campaign) return false;
        if (action === "PUBLISH" && campaign.status === "DRAFT") {
          const settings = await trx.selectFrom("beta_settings").select("campaigns_open as open").where("singleton", "=", true).executeTakeFirstOrThrow();
          if (!settings.open) return false;
          await trx.updateTable("campaigns").set({ status: "PUBLISHED", published_at: now }).where("id", "=", campaignId).execute();
          let users = trx.selectFrom("users").select(["id", "login_count as loginCount", "completed_workout_count as workoutCount"])
            .where("account_status", "=", "ACTIVE").where("beta_cohort", "is not", null);
          if (!campaign.essential) users = users.where("feedback_prompts_enabled", "=", true);
          if (campaign.audience_type === "SELECTED") users = users.where("id", "in", trx.selectFrom("campaign_targets").select("user_id").where("campaign_id", "=", campaignId));
          const recipients = await users.execute();
          if (recipients.length > 0) await trx.insertInto("message_deliveries").values(recipients.map((user) => ({
            campaign_id: campaignId,
            user_id: user.id,
            eligible_at: campaign.scheduled_at ?? campaign.starts_at ?? now,
            trigger_count_target: campaign.trigger_type === "NEXT_LOGIN" ? user.loginCount + 1
              : campaign.trigger_type === "AFTER_WORKOUT" ? user.workoutCount + 1
                : campaign.trigger_threshold
          }))).onConflict((conflict) => conflict.columns(["campaign_id", "user_id"]).doNothing()).execute();
        } else if (action === "PAUSE" && campaign.status === "PUBLISHED") {
          await trx.updateTable("campaigns").set({ status: "PAUSED" }).where("id", "=", campaignId).execute();
        } else if (action === "RESUME" && campaign.status === "PAUSED") {
          await trx.updateTable("campaigns").set({ status: "PUBLISHED" }).where("id", "=", campaignId).execute();
        } else if (action === "END" && (campaign.status === "PUBLISHED" || campaign.status === "PAUSED")) {
          await trx.updateTable("campaigns").set({ status: "ENDED", ended_at: now }).where("id", "=", campaignId).execute();
        } else return false;
        await audit(trx, adminUserId, `CAMPAIGN_${action}`, campaignId, now);
        return true;
      });
    },
    async listEligibleMessages(userId, now) {
      const rows = await db.selectFrom("message_deliveries").innerJoin("campaigns", "campaigns.id", "message_deliveries.campaign_id")
        .innerJoin("users", "users.id", "message_deliveries.user_id")
        .select([
          "campaigns.id", "campaigns.title", "campaigns.body", "campaigns.response_type as responseType",
          "campaigns.response_options as responseOptions", "campaigns.action_url as actionUrl", "campaigns.essential",
          "message_deliveries.shown_at as shownAt"
        ]).where("message_deliveries.user_id", "=", userId).where("campaigns.status", "=", "PUBLISHED")
        .where((eb) => eb.or([eb("campaigns.essential", "=", true), eb("users.feedback_prompts_enabled", "=", true)]))
        .where("message_deliveries.dismissed_at", "is", null).where("message_deliveries.responded_at", "is", null)
        .where("message_deliveries.eligible_at", "<=", now)
        .where((eb) => eb.or([eb("campaigns.ends_at", "is", null), eb("campaigns.ends_at", ">", now)]))
        .where((eb) => eb.or([
          eb("campaigns.trigger_type", "=", "SCHEDULED"),
          eb.and([eb("campaigns.trigger_type", "in", ["NEXT_LOGIN", "NTH_LOGIN"]), eb("users.login_count", ">=", eb.ref("message_deliveries.trigger_count_target"))]),
          eb.and([eb("campaigns.trigger_type", "in", ["AFTER_WORKOUT", "NTH_WORKOUT"]), eb("users.completed_workout_count", ">=", eb.ref("message_deliveries.trigger_count_target"))])
        ])).orderBy("campaigns.essential", "desc").orderBy("message_deliveries.eligible_at", "asc").execute();
      return rows.map((row) => ({ ...row, responseOptions: parseOptions(row.responseOptions) }));
    },
    async listInboxMessages(userId) {
      const rows = await db.selectFrom("message_deliveries").innerJoin("campaigns", "campaigns.id", "message_deliveries.campaign_id")
        .select([
          "campaigns.id", "campaigns.title", "campaigns.body", "campaigns.response_type as responseType",
          "campaigns.response_options as responseOptions", "campaigns.action_url as actionUrl", "campaigns.essential",
          "message_deliveries.shown_at as shownAt", "message_deliveries.dismissed_at as dismissedAt",
          "message_deliveries.responded_at as respondedAt"
        ]).where("message_deliveries.user_id", "=", userId).where("campaigns.status", "!=", "DRAFT")
        .orderBy("message_deliveries.eligible_at", "desc").limit(200).execute();
      return rows.map((row) => ({ ...row, responseOptions: parseOptions(row.responseOptions) }));
    },
    async markShown(userId, campaignId, now) {
      await db.updateTable("message_deliveries").set({ shown_at: now }).where("user_id", "=", userId)
        .where("campaign_id", "=", campaignId).where("shown_at", "is", null).execute();
    },
    async dismiss(userId, campaignId, now) {
      const row = await db.updateTable("message_deliveries").set({ dismissed_at: now }).where("user_id", "=", userId)
        .where("campaign_id", "=", campaignId).where("dismissed_at", "is", null).where("responded_at", "is", null)
        .returning("campaign_id").executeTakeFirst();
      return Boolean(row);
    },
    async respond(userId, campaignId, response, now) {
      return db.transaction().execute(async (trx) => {
        const campaign = await trx.selectFrom("campaigns").select(["response_type as type", "response_options as options"])
          .where("id", "=", campaignId).where("status", "=", "PUBLISHED").executeTakeFirst();
        if (!campaign || campaign.type !== response.type) return false;
        if (response.type === "SINGLE_CHOICE" && !parseOptions(campaign.options).includes(response.choice)) return false;
        const row = await trx.updateTable("message_deliveries").set({ response: JSON.stringify(response), responded_at: now })
          .where("user_id", "=", userId).where("campaign_id", "=", campaignId).where("dismissed_at", "is", null)
          .where("responded_at", "is", null).returning("campaign_id").executeTakeFirst();
        return Boolean(row);
      });
    }
  };
}

function parseOptions(value: unknown): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : [];
}

async function audit(db: Kysely<AppDatabase>, adminUserId: string, action: string, targetId: string, now: Date): Promise<void> {
  await db.insertInto("admin_audit_events").values({ admin_user_id: adminUserId, action, target_type: "CAMPAIGN", target_id: targetId, details: "{}", created_at: now }).execute();
}
