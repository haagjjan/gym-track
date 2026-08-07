import { Kysely, PostgresDialect, type ColumnType } from "kysely";
import { Pool } from "pg";

type TimestampColumn = ColumnType<Date, Date | string | undefined, Date | string>;
type RequiredTimestampColumn = ColumnType<Date, Date | string, Date | string>;
type NullableTimestampColumn = ColumnType<
  Date | null,
  Date | string | null | undefined,
  Date | string | null
>;
type NumericColumn = ColumnType<string, string | number, string | number>;

interface UsersTable {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  volume_heat_ceiling: ColumnType<number, number | undefined, number>;
  email_verified_at: NullableTimestampColumn;
  failed_login_attempts: ColumnType<number, number | undefined, number>;
  locked_until: NullableTimestampColumn;
  role: ColumnType<"USER" | "ADMIN", "USER" | "ADMIN" | undefined, "USER" | "ADMIN">;
  account_status: ColumnType<
    "ACTIVE" | "DELETION_PENDING" | "SUSPENDED",
    "ACTIVE" | "DELETION_PENDING" | "SUSPENDED" | undefined,
    "ACTIVE" | "DELETION_PENDING" | "SUSPENDED"
  >;
  beta_cohort: string | null;
  login_count: ColumnType<number, number | undefined, number>;
  completed_workout_count: ColumnType<number, number | undefined, number>;
  functional_storage_enabled: ColumnType<boolean, boolean | undefined, boolean>;
  storage_preference_decided_at: NullableTimestampColumn;
  analytics_enabled: ColumnType<boolean, boolean | undefined, boolean>;
  feedback_prompts_enabled: ColumnType<boolean, boolean | undefined, boolean>;
  terms_version: string | null;
  privacy_version: string | null;
  policy_accepted_at: NullableTimestampColumn;
  adult_attested_at: NullableTimestampColumn;
  deletion_requested_at: NullableTimestampColumn;
  deletion_due_at: NullableTimestampColumn;
  onboarding_version: ColumnType<number, number | undefined, number>;
  onboarding_steps: ColumnType<unknown, string | undefined, string>;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
}

interface BetaSettingsTable {
  singleton: ColumnType<boolean, boolean | undefined, boolean>;
  waitlist_open: ColumnType<boolean, boolean | undefined, boolean>;
  invitations_open: ColumnType<boolean, boolean | undefined, boolean>;
  campaigns_open: ColumnType<boolean, boolean | undefined, boolean>;
  account_cap: ColumnType<number, number | undefined, number>;
  daily_approval_limit: ColumnType<number, number | undefined, number>;
  updated_at: TimestampColumn;
  updated_by_user_id: string | null;
}

interface BetaAccessRequestsTable {
  id: string;
  email: string;
  status: "PENDING" | "INVITED" | "JOINED" | "EXPIRED" | "BLOCKED";
  terms_version: string;
  privacy_version: string;
  policy_accepted_at: RequiredTimestampColumn;
  adult_attested_at: RequiredTimestampColumn;
  requested_at: TimestampColumn;
  reviewed_at: NullableTimestampColumn;
  reviewed_by_user_id: string | null;
  invitation_token_hash: string | null;
  invitation_expires_at: NullableTimestampColumn;
  invitation_used_at: NullableTimestampColumn;
  joined_user_id: string | null;
  blocked_at: NullableTimestampColumn;
}

interface AdminAuditEventsTable {
  id: ColumnType<string, never, never>;
  admin_user_id: string | null;
  action: string;
  target_type: string;
  target_id: string;
  details: ColumnType<unknown, string | undefined, string>;
  created_at: TimestampColumn;
}

interface AccountDeletionTokensTable {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: RequiredTimestampColumn;
  used_at: NullableTimestampColumn;
  created_at: TimestampColumn;
}

interface ErasureTombstonesTable {
  user_id: string;
  finalized_at: RequiredTimestampColumn;
  expires_at: RequiredTimestampColumn;
}

interface CampaignsTable {
  id: string;
  title: string;
  body: string;
  status: "DRAFT" | "PUBLISHED" | "PAUSED" | "ENDED";
  audience_type: "ALL" | "SELECTED";
  trigger_type: "NEXT_LOGIN" | "NTH_LOGIN" | "NTH_WORKOUT" | "AFTER_WORKOUT" | "SCHEDULED";
  trigger_threshold: number | null;
  response_type: "ACKNOWLEDGEMENT" | "RATING" | "SINGLE_CHOICE" | "FREE_TEXT";
  response_options: ColumnType<unknown, string | undefined, string>;
  action_url: string | null;
  essential: ColumnType<boolean, boolean | undefined, boolean>;
  starts_at: NullableTimestampColumn;
  ends_at: NullableTimestampColumn;
  scheduled_at: NullableTimestampColumn;
  created_by_user_id: string | null;
  created_at: TimestampColumn;
  published_at: NullableTimestampColumn;
  ended_at: NullableTimestampColumn;
}

interface CampaignTargetsTable {
  campaign_id: string;
  user_id: string;
}

interface MessageDeliveriesTable {
  campaign_id: string;
  user_id: string;
  eligible_at: TimestampColumn;
  shown_at: NullableTimestampColumn;
  dismissed_at: NullableTimestampColumn;
  responded_at: NullableTimestampColumn;
  response: ColumnType<unknown | null, string | null | undefined, string | null>;
  trigger_count_target: number | null;
}

interface AuthActionTokensTable {
  id: string;
  user_id: string;
  purpose: "email_verification" | "password_reset";
  token_hash: string;
  expires_at: Date | string;
  used_at: Date | string | null;
  created_at: TimestampColumn;
}

interface AppEventsTable {
  id: ColumnType<string, never, never>;
  user_id: string | null;
  event_name: string;
  properties: ColumnType<unknown, string | undefined, string>;
  created_at: TimestampColumn;
}

interface UserSessionsTable {
  id: string;
  user_id: string;
  session_token_hash: string;
  expires_at: Date | string;
  revoked_at: Date | string | null;
  created_at: TimestampColumn;
  last_used_at: Date | string | null;
}

interface MuscleGroupsTable {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
}

interface ExercisesTable {
  id: string;
  name: string;
  equipment: string | null;
  exercise_type: string | null;
  primary_muscle_group_id: string;
  created_by_user_id: string | null;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
  deleted_at: NullableTimestampColumn;
}

interface ExerciseSecondaryMusclesTable {
  exercise_id: string;
  muscle_group_id: string;
}

interface ExerciseMuscleGroupsTable {
  exercise_id: string;
  muscle_group_id: string;
  role: "PRIMARY" | "SECONDARY";
  created_at: TimestampColumn;
}

interface WorkoutTemplatesTable {
  id: string;
  user_id: string;
  name: string;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
}

interface WorkoutTemplateExercisesTable {
  id: string;
  workout_template_id: string;
  exercise_id: string;
  position: number;
  created_at: TimestampColumn;
}

interface WorkoutSessionsTable {
  id: string;
  user_id: string;
  started_at: RequiredTimestampColumn;
  ended_at: NullableTimestampColumn;
  workout_type: string | null;
  title: string | null;
  notes: string | null;
  source_template_id: string | null;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
  deleted_at: NullableTimestampColumn;
}

interface SessionExercisesTable {
  id: string;
  workout_session_id: string;
  exercise_id: string;
  client_mutation_id: ColumnType<string | null, string | null | undefined, string | null>;
  position: number;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
  deleted_at: NullableTimestampColumn;
}

interface SetsTable {
  id: string;
  session_exercise_id: string;
  client_mutation_id: ColumnType<string | null, string | null | undefined, string | null>;
  set_order: number;
  set_type: string;
  weight_kg: NumericColumn;
  reps: number;
  rir: number;
  rest_time_seconds: number | null;
  note: string | null;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
  deleted_at: NullableTimestampColumn;
}

export interface AppDatabase {
  account_deletion_tokens: AccountDeletionTokensTable;
  admin_audit_events: AdminAuditEventsTable;
  app_events: AppEventsTable;
  auth_action_tokens: AuthActionTokensTable;
  beta_access_requests: BetaAccessRequestsTable;
  beta_settings: BetaSettingsTable;
  campaigns: CampaignsTable;
  campaign_targets: CampaignTargetsTable;
  exercise_muscle_groups: ExerciseMuscleGroupsTable;
  exercise_secondary_muscles: ExerciseSecondaryMusclesTable;
  exercises: ExercisesTable;
  erasure_tombstones: ErasureTombstonesTable;
  message_deliveries: MessageDeliveriesTable;
  muscle_groups: MuscleGroupsTable;
  session_exercises: SessionExercisesTable;
  sets: SetsTable;
  users: UsersTable;
  user_sessions: UserSessionsTable;
  workout_sessions: WorkoutSessionsTable;
  workout_template_exercises: WorkoutTemplateExercisesTable;
  workout_templates: WorkoutTemplatesTable;
}

export function createDatabase(databaseUrl: string): Kysely<AppDatabase> {
  return new Kysely<AppDatabase>({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString: databaseUrl,
        application_name: "gym-tracker-api"
      })
    })
  });
}
