-- Up Migration
ALTER TABLE exercises ADD COLUMN tracking_mode text NOT NULL DEFAULT 'reps'
  CHECK (tracking_mode IN ('reps', 'time'));
ALTER TABLE exercises ADD CONSTRAINT exercises_id_tracking_mode_unique UNIQUE(id, tracking_mode);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM exercises WHERE lower(name) = 'dead hang' OR id = 'd3fc6d63-e425-47cb-bfc0-458367a9dc3c') THEN
    RAISE EXCEPTION 'Dead hang seed identity conflicts with an existing exercise; resolve the catalogue identity before applying time tracking';
  END IF;
END $$;

CREATE TABLE timed_sets (
  id uuid PRIMARY KEY,
  workout_session_id uuid NOT NULL REFERENCES workout_sessions(id),
  exercise_id uuid NOT NULL REFERENCES exercises(id),
  exercise_tracking_mode text NOT NULL DEFAULT 'time' CHECK (exercise_tracking_mode = 'time'),
  FOREIGN KEY (exercise_id, exercise_tracking_mode) REFERENCES exercises(id, tracking_mode),
  set_type text NOT NULL CHECK (set_type IN ('warmup', 'working')),
  duration_seconds integer NOT NULL CHECK (duration_seconds > 0 AND duration_seconds <= 86400),
  added_weight_kg numeric(6,2) CHECK (added_weight_kg >= 0),
  note text CHECK (length(note) <= 1000),
  create_fingerprint text NOT NULL,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX timed_sets_workout_active_idx ON timed_sets(workout_session_id, created_at, id) WHERE deleted_at IS NULL;
CREATE INDEX timed_sets_exercise_idx ON timed_sets(exercise_id, workout_session_id);
CREATE INDEX timed_sets_workout_idx ON timed_sets(workout_session_id);

INSERT INTO exercises(id, name, primary_muscle_group_id, tracking_mode)
SELECT 'd3fc6d63-e425-47cb-bfc0-458367a9dc3c', 'Dead hang', id, 'time'
FROM muscle_groups WHERE slug = 'forearms';
INSERT INTO exercise_muscle_groups(exercise_id, muscle_group_id, role)
SELECT id, primary_muscle_group_id, 'PRIMARY' FROM exercises
WHERE id = 'd3fc6d63-e425-47cb-bfc0-458367a9dc3c' AND tracking_mode = 'time'
ON CONFLICT DO NOTHING;

-- Down Migration
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM exercises e JOIN muscle_groups mg ON mg.id = e.primary_muscle_group_id
    WHERE e.id = 'd3fc6d63-e425-47cb-bfc0-458367a9dc3c'
      AND (e.name <> 'Dead hang' OR e.tracking_mode <> 'time' OR e.created_by_user_id IS NOT NULL
        OR mg.slug <> 'forearms' OR e.equipment IS NOT NULL OR e.exercise_type IS NOT NULL OR e.deleted_at IS NOT NULL
        OR NOT EXISTS (SELECT 1 FROM exercise_muscle_groups emg WHERE emg.exercise_id = e.id AND emg.muscle_group_id = mg.id AND emg.role = 'PRIMARY')
        OR EXISTS (SELECT 1 FROM exercise_muscle_groups emg WHERE emg.exercise_id = e.id AND (emg.muscle_group_id <> mg.id OR emg.role <> 'PRIMARY')))
  ) THEN
    RAISE EXCEPTION 'The time exercise seed was changed; preserve it and disable the feature instead';
  END IF;
  IF EXISTS (SELECT 1 FROM timed_sets) THEN
    RAISE EXCEPTION 'Timed sets exist; disable the feature instead of dropping logged data';
  END IF;
  IF EXISTS (SELECT 1 FROM exercises WHERE tracking_mode = 'time' AND id <> 'd3fc6d63-e425-47cb-bfc0-458367a9dc3c') THEN
    RAISE EXCEPTION 'Custom time exercises exist; disable the feature instead';
  END IF;
  IF EXISTS (SELECT 1 FROM session_exercises se JOIN exercises e ON e.id = se.exercise_id WHERE e.tracking_mode = 'time')
     OR EXISTS (SELECT 1 FROM workout_template_exercises te JOIN exercises e ON e.id = te.exercise_id WHERE e.tracking_mode = 'time') THEN
    RAISE EXCEPTION 'Time exercises are referenced; disable the feature instead';
  END IF;
END $$;
DROP TABLE timed_sets;
DELETE FROM exercise_muscle_groups emg USING exercises e WHERE emg.exercise_id = e.id AND e.id = 'd3fc6d63-e425-47cb-bfc0-458367a9dc3c' AND e.tracking_mode = 'time' AND e.created_by_user_id IS NULL;
DELETE FROM exercises WHERE id = 'd3fc6d63-e425-47cb-bfc0-458367a9dc3c' AND tracking_mode = 'time' AND created_by_user_id IS NULL;
ALTER TABLE exercises DROP COLUMN tracking_mode;
