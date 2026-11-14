-- Up Migration

-- Bodyweight sets are logged with 0 kg.
ALTER TABLE sets DROP CONSTRAINT sets_weight_kg_positive_check;
ALTER TABLE sets ADD CONSTRAINT sets_weight_kg_nonnegative_check CHECK (weight_kg >= 0);

-- Down Migration

-- Fails on purpose while 0 kg sets exist; they would break the old rule.
ALTER TABLE sets DROP CONSTRAINT sets_weight_kg_nonnegative_check;
ALTER TABLE sets ADD CONSTRAINT sets_weight_kg_positive_check CHECK (weight_kg > 0);
