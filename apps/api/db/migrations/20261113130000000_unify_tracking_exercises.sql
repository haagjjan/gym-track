-- Up Migration

-- Time and cardio become ordinary exercises: both are picked from the exercise
-- list and sit in a workout's exercise order. Cardio entries point at an
-- exercise; `activity` keeps the name as logged.
-- Earlier migrations in the same transaction may have queued deferred triggers
-- on `exercises`; flush them before altering the table, then restore deferred
-- checking for the seed inserts below.
SET CONSTRAINTS ALL IMMEDIATE;
SET CONSTRAINTS ALL DEFERRED;

ALTER TABLE exercises DROP CONSTRAINT exercises_tracking_mode_check;
ALTER TABLE exercises ADD CONSTRAINT exercises_tracking_mode_check
  CHECK (tracking_mode IN ('reps', 'time', 'cardio'));

ALTER TABLE cardio_entries ADD COLUMN exercise_id uuid REFERENCES exercises (id);
ALTER TABLE cardio_entries ADD COLUMN calories integer CHECK (calories BETWEEN 1 AND 20000);
CREATE INDEX cardio_entries_exercise_idx ON cardio_entries (exercise_id);

-- Planks are holds. Switch them only while nobody has logged rep sets on them.
UPDATE exercises SET tracking_mode = 'time', updated_at = now()
WHERE created_by_user_id IS NULL AND lower(name) IN ('front plank', 'side plank')
  AND NOT EXISTS (
    SELECT 1 FROM session_exercises se JOIN sets s ON s.session_exercise_id = se.id
    WHERE se.exercise_id = exercises.id
  );

CREATE TEMPORARY TABLE tracking_seed (name text, mode text, muscle text, equipment text, kind text) ON COMMIT DROP;
INSERT INTO tracking_seed VALUES
  ('Wall Sit', 'time', 'quads', 'bodyweight', 'isometric'),
  ('L-Sit', 'time', 'abs', 'bodyweight', 'isometric'),
  ('Hollow Hold', 'time', 'abs', 'bodyweight', 'isometric'),
  ('Superman Hold', 'time', 'back', 'bodyweight', 'isometric'),
  ('Glute Bridge Hold', 'time', 'glutes', 'bodyweight', 'isometric'),
  ('Handstand Hold', 'time', 'shoulders', 'bodyweight', 'isometric'),
  ('Farmer Carry', 'time', 'forearms', 'dumbbell', NULL),
  ('Copenhagen Plank', 'time', 'abs', 'bodyweight', 'isometric'),
  ('Treadmill Run', 'cardio', 'quads', 'machine', NULL),
  ('Outdoor Run', 'cardio', 'quads', 'bodyweight', NULL),
  ('Walking', 'cardio', 'quads', 'bodyweight', NULL),
  ('Stationary Bike', 'cardio', 'quads', 'machine', NULL),
  ('Outdoor Cycling', 'cardio', 'quads', 'other', NULL),
  ('Rowing Machine', 'cardio', 'back', 'machine', NULL),
  ('Elliptical', 'cardio', 'quads', 'machine', NULL),
  ('Stair Climber', 'cardio', 'glutes', 'machine', NULL),
  ('Jump Rope', 'cardio', 'calves', 'other', NULL),
  ('Swimming', 'cardio', 'back', 'bodyweight', NULL);

INSERT INTO exercises (id, name, primary_muscle_group_id, tracking_mode, equipment, exercise_type)
SELECT gen_random_uuid(), seed.name, muscle_groups.id, seed.mode, seed.equipment, seed.kind
FROM tracking_seed seed
JOIN muscle_groups ON muscle_groups.slug = seed.muscle
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE lower(exercises.name) = lower(seed.name));

INSERT INTO exercise_muscle_groups (exercise_id, muscle_group_id, role)
SELECT exercises.id, exercises.primary_muscle_group_id, 'PRIMARY'
FROM exercises
JOIN tracking_seed seed ON lower(seed.name) = lower(exercises.name) AND seed.mode = exercises.tracking_mode
WHERE exercises.created_by_user_id IS NULL
ON CONFLICT DO NOTHING;

-- Down Migration

-- Logged data and user-created exercises are never dropped: switch the feature
-- off with ENABLE_EXTENDED_TRACKING instead.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM cardio_entries WHERE exercise_id IS NOT NULL OR calories IS NOT NULL) THEN
    RAISE EXCEPTION 'Cardio entries exist; disable the feature instead of dropping logged data';
  END IF;
  IF EXISTS (SELECT 1 FROM exercises WHERE tracking_mode = 'cardio' AND created_by_user_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Custom cardio exercises exist; disable the feature instead';
  END IF;
  IF EXISTS (
    SELECT 1 FROM exercises e
    WHERE e.tracking_mode <> 'reps' AND e.created_by_user_id IS NULL
      AND e.id <> 'd3fc6d63-e425-47cb-bfc0-458367a9dc3c'
      AND (EXISTS (SELECT 1 FROM timed_sets t WHERE t.exercise_id = e.id)
        OR EXISTS (SELECT 1 FROM session_exercises se WHERE se.exercise_id = e.id)
        OR EXISTS (SELECT 1 FROM workout_template_exercises te WHERE te.exercise_id = e.id))
  ) THEN
    RAISE EXCEPTION 'Catalog time or cardio exercises are in use; disable the feature instead';
  END IF;
END $$;

UPDATE exercises SET tracking_mode = 'reps', updated_at = now()
WHERE created_by_user_id IS NULL AND lower(name) IN ('front plank', 'side plank');

DELETE FROM exercise_muscle_groups emg USING exercises e
WHERE emg.exercise_id = e.id AND e.created_by_user_id IS NULL AND e.tracking_mode <> 'reps'
  AND e.id <> 'd3fc6d63-e425-47cb-bfc0-458367a9dc3c';
DELETE FROM exercises
WHERE created_by_user_id IS NULL AND tracking_mode <> 'reps'
  AND id <> 'd3fc6d63-e425-47cb-bfc0-458367a9dc3c';

-- The deletes above queue foreign-key checks; run them before altering the table.
SET CONSTRAINTS ALL IMMEDIATE;

DROP INDEX cardio_entries_exercise_idx;
ALTER TABLE cardio_entries DROP COLUMN calories;
ALTER TABLE cardio_entries DROP COLUMN exercise_id;
ALTER TABLE exercises DROP CONSTRAINT exercises_tracking_mode_check;
ALTER TABLE exercises ADD CONSTRAINT exercises_tracking_mode_check CHECK (tracking_mode IN ('reps', 'time'));
