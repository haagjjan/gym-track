-- Up Migration

ALTER TABLE users
  ADD COLUMN email_verified_at timestamptz,
  ADD COLUMN failed_login_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN locked_until timestamptz;

CREATE TABLE auth_action_tokens (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (id),
  purpose text NOT NULL,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_action_tokens_purpose_check
    CHECK (purpose IN ('email_verification', 'password_reset'))
);

CREATE UNIQUE INDEX auth_action_tokens_token_hash_unique
  ON auth_action_tokens (token_hash);
CREATE INDEX auth_action_tokens_user_purpose_created_idx
  ON auth_action_tokens (user_id, purpose, created_at DESC);

CREATE INDEX user_sessions_expires_at_idx ON user_sessions (expires_at);

-- First-party product analytics: server-side events only, no client ingest.
CREATE TABLE app_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES users (id),
  event_name text NOT NULL,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX app_events_event_name_created_at_idx ON app_events (event_name, created_at);
CREATE INDEX app_events_user_id_created_at_idx ON app_events (user_id, created_at);

-- Down Migration

DROP TABLE app_events;
DROP INDEX user_sessions_expires_at_idx;
DROP TABLE auth_action_tokens;

ALTER TABLE users
  DROP COLUMN locked_until,
  DROP COLUMN failed_login_attempts,
  DROP COLUMN email_verified_at;
