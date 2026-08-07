-- Up Migration

ALTER TABLE users
  ADD COLUMN role text NOT NULL DEFAULT 'USER',
  ADD COLUMN account_status text NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN beta_cohort text,
  ADD COLUMN login_count integer NOT NULL DEFAULT 0,
  ADD COLUMN completed_workout_count integer NOT NULL DEFAULT 0,
  ADD COLUMN functional_storage_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN storage_preference_decided_at timestamptz,
  ADD COLUMN analytics_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN feedback_prompts_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN terms_version text,
  ADD COLUMN privacy_version text,
  ADD COLUMN policy_accepted_at timestamptz,
  ADD COLUMN adult_attested_at timestamptz,
  ADD COLUMN deletion_requested_at timestamptz,
  ADD COLUMN deletion_due_at timestamptz,
  ADD COLUMN onboarding_version integer NOT NULL DEFAULT 1,
  ADD COLUMN onboarding_steps jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD CONSTRAINT users_role_check CHECK (role IN ('USER', 'ADMIN')),
  ADD CONSTRAINT users_account_status_check
    CHECK (account_status IN ('ACTIVE', 'DELETION_PENDING', 'SUSPENDED')),
  ADD CONSTRAINT users_login_count_non_negative_check CHECK (login_count >= 0),
  ADD CONSTRAINT users_completed_workout_count_non_negative_check
    CHECK (completed_workout_count >= 0),
  ADD CONSTRAINT users_deletion_window_check CHECK (
    (account_status = 'DELETION_PENDING' AND deletion_requested_at IS NOT NULL AND deletion_due_at IS NOT NULL)
    OR (account_status <> 'DELETION_PENDING' AND deletion_due_at IS NULL)
  );

-- A fresh all-migrations transaction carries deferred exercise trigger events
-- from the system-catalog migration. Flush them before replacing this FK.
SET CONSTRAINTS ALL IMMEDIATE;

ALTER TABLE exercises DROP CONSTRAINT exercises_created_by_user_id_fkey;
ALTER TABLE exercises
  ADD CONSTRAINT exercises_created_by_user_id_fkey
  FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE SET NULL;

SET CONSTRAINTS ALL DEFERRED;

CREATE TABLE beta_settings (
  singleton boolean PRIMARY KEY DEFAULT true,
  waitlist_open boolean NOT NULL DEFAULT false,
  invitations_open boolean NOT NULL DEFAULT false,
  campaigns_open boolean NOT NULL DEFAULT false,
  account_cap integer NOT NULL DEFAULT 50,
  daily_approval_limit integer NOT NULL DEFAULT 10,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by_user_id uuid REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT beta_settings_singleton_check CHECK (singleton),
  CONSTRAINT beta_settings_account_cap_check CHECK (account_cap BETWEEN 1 AND 10000),
  CONSTRAINT beta_settings_daily_limit_check CHECK (daily_approval_limit BETWEEN 1 AND 1000)
);

INSERT INTO beta_settings (singleton) VALUES (true);

CREATE TABLE beta_access_requests (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  terms_version text NOT NULL,
  privacy_version text NOT NULL,
  policy_accepted_at timestamptz NOT NULL,
  adult_attested_at timestamptz NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by_user_id uuid REFERENCES users (id) ON DELETE SET NULL,
  invitation_token_hash text,
  invitation_expires_at timestamptz,
  invitation_used_at timestamptz,
  joined_user_id uuid REFERENCES users (id) ON DELETE SET NULL,
  blocked_at timestamptz,
  CONSTRAINT beta_access_requests_status_check
    CHECK (status IN ('PENDING', 'INVITED', 'JOINED', 'EXPIRED', 'BLOCKED')),
  CONSTRAINT beta_access_requests_invitation_check CHECK (
    (status = 'INVITED' AND invitation_token_hash IS NOT NULL AND invitation_expires_at IS NOT NULL)
    OR status <> 'INVITED'
  )
);

CREATE UNIQUE INDEX beta_access_requests_email_lower_unique
  ON beta_access_requests (lower(email));
CREATE UNIQUE INDEX beta_access_requests_invitation_hash_unique
  ON beta_access_requests (invitation_token_hash)
  WHERE invitation_token_hash IS NOT NULL;
CREATE INDEX beta_access_requests_status_requested_idx
  ON beta_access_requests (status, requested_at);

CREATE TABLE admin_audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_user_id uuid REFERENCES users (id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX admin_audit_events_created_at_idx ON admin_audit_events (created_at DESC);

CREATE TABLE account_deletion_tokens (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE erasure_tombstones (
  user_id uuid PRIMARY KEY,
  finalized_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL
);

CREATE INDEX erasure_tombstones_expires_at_idx ON erasure_tombstones (expires_at);

CREATE TABLE campaigns (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT',
  audience_type text NOT NULL,
  trigger_type text NOT NULL,
  trigger_threshold integer,
  response_type text NOT NULL,
  response_options jsonb NOT NULL DEFAULT '[]'::jsonb,
  action_url text,
  essential boolean NOT NULL DEFAULT false,
  starts_at timestamptz,
  ends_at timestamptz,
  scheduled_at timestamptz,
  created_by_user_id uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  ended_at timestamptz,
  CONSTRAINT campaigns_status_check CHECK (status IN ('DRAFT', 'PUBLISHED', 'PAUSED', 'ENDED')),
  CONSTRAINT campaigns_audience_check CHECK (audience_type IN ('ALL', 'SELECTED')),
  CONSTRAINT campaigns_trigger_check CHECK (
    trigger_type IN ('NEXT_LOGIN', 'NTH_LOGIN', 'NTH_WORKOUT', 'AFTER_WORKOUT', 'SCHEDULED')
  ),
  CONSTRAINT campaigns_response_check CHECK (
    response_type IN ('ACKNOWLEDGEMENT', 'RATING', 'SINGLE_CHOICE', 'FREE_TEXT')
  ),
  CONSTRAINT campaigns_threshold_check CHECK (trigger_threshold IS NULL OR trigger_threshold > 0),
  CONSTRAINT campaigns_window_check CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE TABLE campaign_targets (
  campaign_id uuid NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  PRIMARY KEY (campaign_id, user_id)
);

CREATE TABLE message_deliveries (
  campaign_id uuid NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  eligible_at timestamptz NOT NULL DEFAULT now(),
  shown_at timestamptz,
  dismissed_at timestamptz,
  responded_at timestamptz,
  response jsonb,
  trigger_count_target integer,
  PRIMARY KEY (campaign_id, user_id)
);

CREATE INDEX message_deliveries_user_eligible_idx
  ON message_deliveries (user_id, eligible_at)
  WHERE dismissed_at IS NULL AND responded_at IS NULL;

-- Down Migration

DROP TABLE message_deliveries;
DROP TABLE campaign_targets;
DROP TABLE campaigns;
DROP INDEX erasure_tombstones_expires_at_idx;
DROP TABLE erasure_tombstones;
DROP TABLE account_deletion_tokens;
DROP TABLE admin_audit_events;
DROP TABLE beta_access_requests;
DROP TABLE beta_settings;

ALTER TABLE exercises DROP CONSTRAINT exercises_created_by_user_id_fkey;
ALTER TABLE exercises
  ADD CONSTRAINT exercises_created_by_user_id_fkey
  FOREIGN KEY (created_by_user_id) REFERENCES users (id);

ALTER TABLE users
  DROP CONSTRAINT users_deletion_window_check,
  DROP CONSTRAINT users_completed_workout_count_non_negative_check,
  DROP CONSTRAINT users_login_count_non_negative_check,
  DROP CONSTRAINT users_account_status_check,
  DROP CONSTRAINT users_role_check,
  DROP COLUMN onboarding_steps,
  DROP COLUMN onboarding_version,
  DROP COLUMN deletion_due_at,
  DROP COLUMN deletion_requested_at,
  DROP COLUMN adult_attested_at,
  DROP COLUMN policy_accepted_at,
  DROP COLUMN privacy_version,
  DROP COLUMN terms_version,
  DROP COLUMN feedback_prompts_enabled,
  DROP COLUMN analytics_enabled,
  DROP COLUMN functional_storage_enabled,
  DROP COLUMN storage_preference_decided_at,
  DROP COLUMN completed_workout_count,
  DROP COLUMN login_count,
  DROP COLUMN beta_cohort,
  DROP COLUMN account_status,
  DROP COLUMN role;
