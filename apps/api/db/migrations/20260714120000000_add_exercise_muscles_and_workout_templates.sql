-- Up Migration

CREATE TABLE exercise_muscle_groups (
  exercise_id uuid NOT NULL REFERENCES exercises (id),
  muscle_group_id uuid NOT NULL REFERENCES muscle_groups (id),
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (exercise_id, muscle_group_id),
  CONSTRAINT exercise_muscle_groups_role_check
    CHECK (role IN ('PRIMARY', 'SECONDARY'))
);

CREATE INDEX exercise_muscle_groups_muscle_role_idx
  ON exercise_muscle_groups (muscle_group_id, role, exercise_id);

INSERT INTO exercise_muscle_groups (exercise_id, muscle_group_id, role)
SELECT id, primary_muscle_group_id, 'PRIMARY'
FROM exercises;

INSERT INTO exercise_muscle_groups (exercise_id, muscle_group_id, role)
SELECT exercise_id, muscle_group_id, 'SECONDARY'
FROM exercise_secondary_muscles
ON CONFLICT (exercise_id, muscle_group_id) DO NOTHING;

CREATE FUNCTION exercise_muscle_assignment_requires_primary() RETURNS trigger AS $$
DECLARE
  checked_exercise_id uuid;
BEGIN
  checked_exercise_id := COALESCE(NEW.exercise_id, OLD.exercise_id);

  IF EXISTS (SELECT 1 FROM exercises WHERE id = checked_exercise_id)
    AND NOT EXISTS (
      SELECT 1
      FROM exercise_muscle_groups
      WHERE exercise_id = checked_exercise_id AND role = 'PRIMARY'
    )
  THEN
    RAISE EXCEPTION 'exercise % requires at least one primary muscle group', checked_exercise_id
      USING ERRCODE = '23514';
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER exercise_muscle_groups_require_primary
AFTER INSERT OR UPDATE OR DELETE ON exercise_muscle_groups
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION exercise_muscle_assignment_requires_primary();

CREATE FUNCTION exercise_row_requires_primary() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM exercise_muscle_groups
    WHERE exercise_id = NEW.id AND role = 'PRIMARY'
  )
  THEN
    RAISE EXCEPTION 'exercise % requires at least one primary muscle group', NEW.id
      USING ERRCODE = '23514';
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER exercises_require_primary_muscle
AFTER INSERT OR UPDATE ON exercises
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION exercise_row_requires_primary();

-- Keep the legacy single-primary column deployable during a rolling release.
-- The new application dual-writes; an older process still receives a valid
-- normalized PRIMARY assignment on insert or primary-muscle update.
CREATE FUNCTION sync_legacy_exercise_primary_muscle() RETURNS trigger AS $$
BEGIN
  DELETE FROM exercise_muscle_groups
  WHERE exercise_id = NEW.id AND role = 'PRIMARY';

  INSERT INTO exercise_muscle_groups (exercise_id, muscle_group_id, role)
  VALUES (NEW.id, NEW.primary_muscle_group_id, 'PRIMARY')
  ON CONFLICT (exercise_id, muscle_group_id)
  DO UPDATE SET role = 'PRIMARY';

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER exercises_sync_legacy_primary_muscle
AFTER INSERT OR UPDATE OF primary_muscle_group_id ON exercises
FOR EACH ROW EXECUTE FUNCTION sync_legacy_exercise_primary_muscle();

CREATE TABLE workout_templates (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (id),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workout_templates_name_check
    CHECK (length(btrim(name)) BETWEEN 1 AND 120)
);

CREATE INDEX workout_templates_user_updated_idx
  ON workout_templates (user_id, updated_at DESC);

CREATE TABLE workout_template_exercises (
  id uuid PRIMARY KEY,
  workout_template_id uuid NOT NULL REFERENCES workout_templates (id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES exercises (id),
  position integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workout_template_exercises_position_positive_check CHECK (position > 0),
  CONSTRAINT workout_template_exercises_position_unique
    UNIQUE (workout_template_id, position)
);

CREATE INDEX workout_template_exercises_template_position_idx
  ON workout_template_exercises (workout_template_id, position);

CREATE INDEX workout_template_exercises_exercise_id_idx
  ON workout_template_exercises (exercise_id);

ALTER TABLE workout_sessions
  ADD COLUMN source_template_id uuid REFERENCES workout_templates (id) ON DELETE SET NULL;

CREATE INDEX workout_sessions_source_template_id_idx
  ON workout_sessions (source_template_id)
  WHERE source_template_id IS NOT NULL;

-- Down Migration

DROP INDEX workout_sessions_source_template_id_idx;
ALTER TABLE workout_sessions DROP COLUMN source_template_id;
DROP TABLE workout_template_exercises;
DROP TABLE workout_templates;
DROP TRIGGER IF EXISTS exercises_sync_legacy_primary_muscle ON exercises;
DROP FUNCTION IF EXISTS sync_legacy_exercise_primary_muscle;
DROP TRIGGER exercises_require_primary_muscle ON exercises;
DROP TRIGGER exercise_muscle_groups_require_primary ON exercise_muscle_groups;
DROP FUNCTION exercise_row_requires_primary;
DROP FUNCTION exercise_muscle_assignment_requires_primary;
DROP TABLE exercise_muscle_groups;
