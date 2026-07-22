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
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
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
  position: number;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
  deleted_at: NullableTimestampColumn;
}

interface SetsTable {
  id: string;
  session_exercise_id: string;
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
  app_events: AppEventsTable;
  auth_action_tokens: AuthActionTokensTable;
  exercise_muscle_groups: ExerciseMuscleGroupsTable;
  exercise_secondary_muscles: ExerciseSecondaryMusclesTable;
  exercises: ExercisesTable;
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
