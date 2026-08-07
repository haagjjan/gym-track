-- Up Migration

ALTER TABLE session_exercises
  ADD COLUMN client_mutation_id uuid;

CREATE UNIQUE INDEX session_exercises_client_mutation_unique
  ON session_exercises (workout_session_id, client_mutation_id)
  WHERE client_mutation_id IS NOT NULL;

ALTER TABLE sets
  ADD COLUMN client_mutation_id uuid;

CREATE UNIQUE INDEX sets_client_mutation_unique
  ON sets (session_exercise_id, client_mutation_id)
  WHERE client_mutation_id IS NOT NULL;

-- Down Migration

DROP INDEX sets_client_mutation_unique;
ALTER TABLE sets DROP COLUMN client_mutation_id;

DROP INDEX session_exercises_client_mutation_unique;
ALTER TABLE session_exercises DROP COLUMN client_mutation_id;
