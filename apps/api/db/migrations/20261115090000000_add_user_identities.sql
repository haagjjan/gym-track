-- Up Migration
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
CREATE TABLE user_identities (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('apple', 'google')),
  provider_subject text NOT NULL,
  email_at_link text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_subject)
);
CREATE INDEX user_identities_user_id_idx ON user_identities(user_id);

-- Down Migration
-- Refuse rollback while passwordless accounts exist; never invent credentials.
ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
DROP TABLE user_identities;
