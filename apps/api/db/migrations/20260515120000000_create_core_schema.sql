-- Up Migration

CREATE TABLE users (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  username text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX users_email_lower_unique ON users (lower(email));
CREATE UNIQUE INDEX users_username_lower_unique ON users (lower(username));

CREATE TABLE user_sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (id),
  session_token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

CREATE INDEX user_sessions_user_id_expires_at_idx ON user_sessions (user_id, expires_at);
CREATE UNIQUE INDEX user_sessions_session_token_hash_unique ON user_sessions (session_token_hash);

CREATE TABLE muscle_groups (
  id uuid PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  sort_order integer NOT NULL UNIQUE
);

CREATE TABLE exercises (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  equipment text,
  exercise_type text,
  primary_muscle_group_id uuid NOT NULL REFERENCES muscle_groups (id),
  created_by_user_id uuid REFERENCES users (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX exercises_name_lower_unique ON exercises (lower(name));
CREATE INDEX exercises_primary_muscle_group_id_idx ON exercises (primary_muscle_group_id);
CREATE INDEX exercises_name_lower_search_idx ON exercises (lower(name) text_pattern_ops);

CREATE TABLE exercise_secondary_muscles (
  exercise_id uuid NOT NULL REFERENCES exercises (id),
  muscle_group_id uuid NOT NULL REFERENCES muscle_groups (id),
  PRIMARY KEY (exercise_id, muscle_group_id)
);

CREATE INDEX exercise_secondary_muscles_muscle_group_id_idx
  ON exercise_secondary_muscles (muscle_group_id);

CREATE TABLE workout_sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (id),
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  workout_type text,
  title text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT workout_sessions_ended_at_after_started_at_check
    CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE UNIQUE INDEX workout_sessions_one_open_per_user_idx
  ON workout_sessions (user_id)
  WHERE ended_at IS NULL AND deleted_at IS NULL;

CREATE INDEX workout_sessions_user_id_started_at_desc_idx
  ON workout_sessions (user_id, started_at DESC);

CREATE INDEX workout_sessions_user_id_started_at_ended_at_idx
  ON workout_sessions (user_id, started_at, ended_at);

CREATE TABLE session_exercises (
  id uuid PRIMARY KEY,
  workout_session_id uuid NOT NULL REFERENCES workout_sessions (id),
  exercise_id uuid NOT NULL REFERENCES exercises (id),
  position integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT session_exercises_position_positive_check CHECK (position > 0)
);

CREATE UNIQUE INDEX session_exercises_active_position_unique
  ON session_exercises (workout_session_id, position)
  WHERE deleted_at IS NULL;

CREATE INDEX session_exercises_workout_session_id_position_idx
  ON session_exercises (workout_session_id, position);

CREATE INDEX session_exercises_exercise_id_idx ON session_exercises (exercise_id);

CREATE TABLE sets (
  id uuid PRIMARY KEY,
  session_exercise_id uuid NOT NULL REFERENCES session_exercises (id),
  set_order integer NOT NULL,
  set_type text NOT NULL,
  weight_kg numeric(6,2) NOT NULL,
  reps integer NOT NULL,
  rir integer NOT NULL,
  rest_time_seconds integer,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT sets_set_order_positive_check CHECK (set_order > 0),
  CONSTRAINT sets_set_type_check CHECK (set_type IN ('warmup', 'working')),
  CONSTRAINT sets_weight_kg_positive_check CHECK (weight_kg > 0),
  CONSTRAINT sets_reps_positive_check CHECK (reps > 0),
  CONSTRAINT sets_rir_range_check CHECK (rir >= 0 AND rir <= 10),
  CONSTRAINT sets_rest_time_seconds_non_negative_check
    CHECK (rest_time_seconds IS NULL OR rest_time_seconds >= 0)
);

CREATE UNIQUE INDEX sets_active_set_order_unique
  ON sets (session_exercise_id, set_order)
  WHERE deleted_at IS NULL;

CREATE INDEX sets_session_exercise_id_set_order_idx ON sets (session_exercise_id, set_order);
CREATE INDEX sets_set_type_deleted_at_idx ON sets (set_type, deleted_at);

-- Down Migration

DROP TABLE sets;
DROP TABLE session_exercises;
DROP TABLE workout_sessions;
DROP TABLE exercise_secondary_muscles;
DROP TABLE exercises;
DROP TABLE muscle_groups;
DROP TABLE user_sessions;
DROP TABLE users;
