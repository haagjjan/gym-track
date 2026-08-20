import { sql, type Kysely } from "kysely";
import type { AppDatabase } from "../../db/database.js";
import type { OnboardingUpdate, PrivacyPreferencesUpdate } from "./user-account.schemas.js";

export interface AccountCredentials {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  accountStatus: "ACTIVE" | "DELETION_PENDING" | "SUSPENDED";
}

export interface PrivacyPreferences {
  functionalStorageEnabled: boolean;
  storagePreferenceDecided: boolean;
  analyticsEnabled: boolean;
  feedbackPromptsEnabled: boolean;
}

export interface OnboardingState {
  version: number;
  steps: Record<string, boolean>;
}

export interface UserAccountRepository {
  getCredentials(userId: string): Promise<AccountCredentials | null>;
  getPrivacy(userId: string): Promise<PrivacyPreferences | null>;
  updatePrivacy(userId: string, update: PrivacyPreferencesUpdate, now: Date): Promise<PrivacyPreferences | null>;
  getOnboarding(userId: string): Promise<OnboardingState | null>;
  updateOnboarding(userId: string, update: OnboardingUpdate, now: Date): Promise<OnboardingState | null>;
  exportAccount(userId: string): Promise<Record<string, unknown>>;
  requestDeletion(userId: string, token: { id: string; hash: string; expiresAt: Date }, now: Date, dueAt: Date): Promise<boolean>;
  cancelDeletion(tokenHash: string, now: Date): Promise<{ email: string } | null>;
  cancelDeletionByAdmin(userId: string, adminUserId: string, now: Date): Promise<{ email: string } | null>;
  listDueDeletions(now: Date): Promise<Array<{ id: string; email: string }>>;
  finalizeDeletion(userId: string, now: Date): Promise<boolean>;
  cleanupRetention(now: Date): Promise<void>;
}

export function createUserAccountRepository(db: Kysely<AppDatabase>): UserAccountRepository {
  return {
    async getCredentials(userId) {
      return await db.selectFrom("users").select([
        "id", "email", "username", "password_hash as passwordHash", "account_status as accountStatus"
      ]).where("id", "=", userId).executeTakeFirst() ?? null;
    },
    async getPrivacy(userId) {
      const row = await db.selectFrom("users").select([
        "functional_storage_enabled as functionalStorageEnabled",
        "storage_preference_decided_at as storagePreferenceDecidedAt",
        "analytics_enabled as analyticsEnabled",
        "feedback_prompts_enabled as feedbackPromptsEnabled"
      ]).where("id", "=", userId).executeTakeFirst();
      return row ? {
        functionalStorageEnabled: row.functionalStorageEnabled,
        storagePreferenceDecided: row.storagePreferenceDecidedAt !== null,
        analyticsEnabled: row.analyticsEnabled,
        feedbackPromptsEnabled: row.feedbackPromptsEnabled
      } : null;
    },
    async updatePrivacy(userId, update, now) {
      const row = await db.updateTable("users").set({
        ...(update.functionalStorageEnabled !== undefined ? { functional_storage_enabled: update.functionalStorageEnabled } : {}),
        ...(update.functionalStorageEnabled !== undefined ? { storage_preference_decided_at: now } : {}),
        ...(update.analyticsEnabled !== undefined ? { analytics_enabled: update.analyticsEnabled } : {}),
        ...(update.feedbackPromptsEnabled !== undefined ? { feedback_prompts_enabled: update.feedbackPromptsEnabled } : {}),
        updated_at: now
      }).where("id", "=", userId).returning([
        "functional_storage_enabled as functionalStorageEnabled",
        "storage_preference_decided_at as storagePreferenceDecidedAt",
        "analytics_enabled as analyticsEnabled",
        "feedback_prompts_enabled as feedbackPromptsEnabled"
      ]).executeTakeFirst();
      return row ? {
        functionalStorageEnabled: row.functionalStorageEnabled,
        storagePreferenceDecided: row.storagePreferenceDecidedAt !== null,
        analyticsEnabled: row.analyticsEnabled,
        feedbackPromptsEnabled: row.feedbackPromptsEnabled
      } : null;
    },
    async getOnboarding(userId) {
      const row = await db.selectFrom("users").select([
        "onboarding_version as version", "onboarding_steps as steps"
      ]).where("id", "=", userId).executeTakeFirst();
      if (!row) return null;
      return { version: row.version, steps: parseSteps(row.steps) };
    },
    async updateOnboarding(userId, update, now) {
      const row = await db.updateTable("users").set({
        onboarding_version: sql<number>`greatest(onboarding_version, ${update.version})`,
        onboarding_steps: sql`onboarding_steps || ${JSON.stringify(update.steps)}::jsonb`,
        updated_at: now
      }).where("id", "=", userId).returning([
        "onboarding_version as version", "onboarding_steps as steps"
      ]).executeTakeFirst();
      return row ? { version: row.version, steps: parseSteps(row.steps) } : null;
    },
    async exportAccount(userId) {
      const [profile, loginHistory, workouts, sessionExercises, sets, templates, templateExercises, customExercises, events, access, messages] = await Promise.all([
        db.selectFrom("users").select([
          "id", "email", "username", "email_verified_at as emailVerifiedAt", "role", "account_status as accountStatus",
          "beta_cohort as betaCohort", "volume_heat_ceiling as volumeHeatCeiling", "functional_storage_enabled as functionalStorageEnabled",
          "storage_preference_decided_at as storagePreferenceDecidedAt",
          "analytics_enabled as analyticsEnabled", "feedback_prompts_enabled as feedbackPromptsEnabled", "terms_version as termsVersion",
          "privacy_version as privacyVersion", "policy_accepted_at as policyAcceptedAt", "adult_attested_at as adultAttestedAt",
          "login_count as successfulLoginCount", "completed_workout_count as completedWorkoutCount",
          "onboarding_version as onboardingVersion", "onboarding_steps as onboardingSteps", "created_at as createdAt", "updated_at as updatedAt"
        ]).where("id", "=", userId).executeTakeFirst(),
        db.selectFrom("user_sessions").select(["created_at as signedInAt", "last_used_at as lastUsedAt", "expires_at as expiresAt", "revoked_at as revokedAt"])
          .where("user_id", "=", userId).orderBy("created_at", "desc").execute(),
        db.selectFrom("workout_sessions").selectAll().where("user_id", "=", userId).execute(),
        db.selectFrom("session_exercises").innerJoin("workout_sessions", "workout_sessions.id", "session_exercises.workout_session_id")
          .selectAll("session_exercises").where("workout_sessions.user_id", "=", userId).execute(),
        db.selectFrom("sets").innerJoin("session_exercises", "session_exercises.id", "sets.session_exercise_id")
          .innerJoin("workout_sessions", "workout_sessions.id", "session_exercises.workout_session_id")
          .selectAll("sets").where("workout_sessions.user_id", "=", userId).execute(),
        db.selectFrom("workout_templates").selectAll().where("user_id", "=", userId).execute(),
        db.selectFrom("workout_template_exercises").innerJoin("workout_templates", "workout_templates.id", "workout_template_exercises.workout_template_id")
          .selectAll("workout_template_exercises").where("workout_templates.user_id", "=", userId).execute(),
        db.selectFrom("exercises").selectAll().where("created_by_user_id", "=", userId).execute(),
        db.selectFrom("app_events").select(["event_name", "properties", "created_at"]).where("user_id", "=", userId).execute(),
        db.selectFrom("beta_access_requests").select(["status", "terms_version", "privacy_version", "policy_accepted_at", "adult_attested_at", "requested_at", "reviewed_at", "invitation_expires_at", "invitation_used_at"])
          .where("joined_user_id", "=", userId).execute(),
        db.selectFrom("message_deliveries").innerJoin("campaigns", "campaigns.id", "message_deliveries.campaign_id")
          .select(["campaigns.title", "message_deliveries.shown_at", "message_deliveries.dismissed_at", "message_deliveries.responded_at", "message_deliveries.response"])
          .where("message_deliveries.user_id", "=", userId).execute()
      ]);
      return {
        exportedAt: new Date().toISOString(),
        profile,
        accessHistory: loginHistory,
        workouts,
        sessionExercises,
        sets,
        templates,
        templateExercises,
        customExercises,
        productEvents: events,
        betaAccess: access,
        messages,
        deviceDataNote: "Body profile, favorite lifts, display settings, filters, and unfinished drafts are stored in this browser and are not present in this server export."
      };
    },
    async requestDeletion(userId, token, now, dueAt) {
      return db.transaction().execute(async (trx) => {
        const updated = await trx.updateTable("users").set({
          account_status: "DELETION_PENDING", deletion_requested_at: now, deletion_due_at: dueAt, updated_at: now
        }).where("id", "=", userId).where("account_status", "=", "ACTIVE").returning("id").executeTakeFirst();
        if (!updated) return false;
        await trx.updateTable("user_sessions").set({ revoked_at: now }).where("user_id", "=", userId)
          .where("revoked_at", "is", null).execute();
        await trx.deleteFrom("account_deletion_tokens").where("user_id", "=", userId).execute();
        await trx.insertInto("account_deletion_tokens").values({
          id: token.id, user_id: userId, token_hash: token.hash, expires_at: token.expiresAt, created_at: now
        }).execute();
        return true;
      });
    },
    async cancelDeletion(tokenHash, now) {
      return db.transaction().execute(async (trx) => {
        const token = await trx.selectFrom("account_deletion_tokens").innerJoin("users", "users.id", "account_deletion_tokens.user_id")
          .select(["account_deletion_tokens.id", "users.id as userId", "users.email"])
          .where("token_hash", "=", tokenHash).where("used_at", "is", null).where("expires_at", ">", now)
          .where("users.account_status", "=", "DELETION_PENDING").forUpdate().executeTakeFirst();
        if (!token) return null;
        await trx.updateTable("account_deletion_tokens").set({ used_at: now }).where("id", "=", token.id).execute();
        await trx.updateTable("users").set({
          account_status: "ACTIVE", deletion_requested_at: null, deletion_due_at: null, updated_at: now
        }).where("id", "=", token.userId).execute();
        return { email: token.email };
      });
    },
    async cancelDeletionByAdmin(userId, adminUserId, now) {
      return db.transaction().execute(async (trx) => {
        const user = await trx.selectFrom("users").select(["id", "email"])
          .where("id", "=", userId).where("account_status", "=", "DELETION_PENDING")
          .forUpdate().executeTakeFirst();
        if (!user) return null;
        await trx.updateTable("users").set({
          account_status: "ACTIVE", deletion_requested_at: null, deletion_due_at: null, updated_at: now
        }).where("id", "=", userId).execute();
        await trx.updateTable("account_deletion_tokens").set({ used_at: now })
          .where("user_id", "=", userId).where("used_at", "is", null).execute();
        await trx.insertInto("admin_audit_events").values({
          admin_user_id: adminUserId, action: "ACCOUNT_DELETION_CANCELLED_BY_SUPPORT",
          target_type: "USER", target_id: userId, details: "{}", created_at: now
        }).execute();
        return { email: user.email };
      });
    },
    async listDueDeletions(now) {
      return db.selectFrom("users").select(["id", "email"]).where("account_status", "=", "DELETION_PENDING")
        .where("deletion_due_at", "<=", now).limit(50).execute();
    },
    async finalizeDeletion(userId, now) {
      return db.transaction().execute(async (trx) => {
        const user = await trx.selectFrom("users").select("id").where("id", "=", userId)
          .where("account_status", "=", "DELETION_PENDING").where("deletion_due_at", "<=", now).forUpdate().executeTakeFirst();
        if (!user) return false;
        const customExercises = await trx.selectFrom("exercises").select("id").where("created_by_user_id", "=", userId).execute();
        await sql`DELETE FROM sets USING session_exercises se, workout_sessions ws WHERE sets.session_exercise_id = se.id AND se.workout_session_id = ws.id AND ws.user_id = ${userId}`.execute(trx);
        await sql`DELETE FROM session_exercises USING workout_sessions ws WHERE session_exercises.workout_session_id = ws.id AND ws.user_id = ${userId}`.execute(trx);
        await trx.deleteFrom("workout_sessions").where("user_id", "=", userId).execute();
        await trx.deleteFrom("workout_templates").where("user_id", "=", userId).execute();
        await trx.deleteFrom("message_deliveries").where("user_id", "=", userId).execute();
        await trx.deleteFrom("campaign_targets").where("user_id", "=", userId).execute();
        await trx.deleteFrom("app_events").where("user_id", "=", userId).execute();
        await trx.deleteFrom("auth_action_tokens").where("user_id", "=", userId).execute();
        await trx.deleteFrom("user_sessions").where("user_id", "=", userId).execute();
        await trx.deleteFrom("beta_access_requests").where("joined_user_id", "=", userId).execute();
        await trx.deleteFrom("account_deletion_tokens").where("user_id", "=", userId).execute();
        await trx.updateTable("admin_audit_events").set({ target_id: "erased" })
          .where("target_type", "=", "USER").where("target_id", "=", userId).execute();
        await trx.insertInto("erasure_tombstones").values({
          user_id: userId, finalized_at: now, expires_at: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        }).onConflict((conflict) => conflict.column("user_id").doUpdateSet({ finalized_at: now })).execute();
        for (const exercise of customExercises) {
          const referenced = await trx.selectFrom("session_exercises").select("id").where("exercise_id", "=", exercise.id).limit(1).executeTakeFirst()
            ?? await trx.selectFrom("workout_template_exercises").select("id").where("exercise_id", "=", exercise.id).limit(1).executeTakeFirst();
          if (!referenced) {
            await trx.deleteFrom("exercise_secondary_muscles").where("exercise_id", "=", exercise.id).execute();
            await trx.deleteFrom("exercise_muscle_groups").where("exercise_id", "=", exercise.id).execute();
            await trx.deleteFrom("exercises").where("id", "=", exercise.id).execute();
          }
        }

        await trx.deleteFrom("users").where("id", "=", userId).execute();

        return true;
      });
    },
    async cleanupRetention(now) {
      const eventCutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const responseCutoff = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      const waitlistCutoff = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      const invitationCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      await db.deleteFrom("app_events").where("user_id", "is not", null).where("created_at", "<", eventCutoff).execute();
      await db.updateTable("message_deliveries").set({ response: null })
        .where("campaign_id", "in", db.selectFrom("campaigns").select("id")
          .where("ended_at", "<", responseCutoff))
        .execute();
      await db.deleteFrom("beta_access_requests").where("status", "=", "PENDING").where("requested_at", "<", waitlistCutoff).execute();
      await db.deleteFrom("beta_access_requests").where("status", "in", ["EXPIRED", "JOINED"])
        .where("reviewed_at", "<", invitationCutoff).execute();
      await db.deleteFrom("erasure_tombstones").where("expires_at", "<", now).execute();
    }
  };
}

function parseSteps(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean"));
}
