-- Up Migration

-- The preceding classification migration flushes deferred constraints when a
-- fresh database applies every migration in one transaction. Restore the
-- normal deferred mode so the exercise's sync trigger can add its PRIMARY row.
SET CONSTRAINTS ALL DEFERRED;

INSERT INTO exercises (
  id,
  name,
  equipment,
  exercise_type,
  primary_muscle_group_id,
  created_by_user_id
)
SELECT
  '00000000-0000-4000-8000-000000000101',
  'Bench Press',
  'barbell',
  'compound',
  muscle_groups.id,
  NULL
FROM muscle_groups
WHERE muscle_groups.slug = 'chest'
  AND NOT EXISTS (
    SELECT 1
    FROM exercises
    WHERE lower(exercises.name) = lower('Bench Press')
  );

-- Down Migration

DELETE FROM exercise_muscle_groups
WHERE exercise_id = '00000000-0000-4000-8000-000000000101'
  AND NOT EXISTS (
    SELECT 1
    FROM session_exercises
    WHERE session_exercises.exercise_id = '00000000-0000-4000-8000-000000000101'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM workout_template_exercises
    WHERE workout_template_exercises.exercise_id = '00000000-0000-4000-8000-000000000101'
  );

DELETE FROM exercises
WHERE id = '00000000-0000-4000-8000-000000000101'
  AND NOT EXISTS (
    SELECT 1
    FROM session_exercises
    WHERE session_exercises.exercise_id = exercises.id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM workout_template_exercises
    WHERE workout_template_exercises.exercise_id = exercises.id
  );
