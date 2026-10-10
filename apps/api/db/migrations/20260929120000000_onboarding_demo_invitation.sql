-- Up Migration
UPDATE users
SET onboarding_steps = onboarding_steps || '{"demoInvitationHandled": true}'::jsonb,
    onboarding_version = greatest(onboarding_version, 2);
ALTER TABLE users ALTER COLUMN onboarding_version SET DEFAULT 2;

-- Down Migration
-- Preserve user choices and lesson evidence on rollback.
ALTER TABLE users ALTER COLUMN onboarding_version SET DEFAULT 1;
