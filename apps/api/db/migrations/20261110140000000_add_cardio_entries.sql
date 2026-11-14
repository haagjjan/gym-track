-- Up Migration
CREATE TABLE cardio_entries (
  id uuid PRIMARY KEY,
  workout_session_id uuid NOT NULL REFERENCES workout_sessions(id),
  activity text NOT NULL CHECK (length(btrim(activity)) BETWEEN 1 AND 100),
  duration_seconds integer NOT NULL CHECK (duration_seconds > 0 AND duration_seconds <= 86400),
  distance_metres numeric(10,2) CHECK (distance_metres > 0),
  average_heart_rate integer CHECK (average_heart_rate BETWEEN 20 AND 300),
  note text CHECK (length(note) <= 1000),
  create_fingerprint text NOT NULL,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX cardio_entries_workout_idx ON cardio_entries(workout_session_id);
CREATE INDEX cardio_entries_workout_active_idx ON cardio_entries(workout_session_id, created_at, id) WHERE deleted_at IS NULL;

-- Down Migration
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM cardio_entries) THEN
    RAISE EXCEPTION 'Cardio entries exist; disable the feature instead of dropping logged data';
  END IF;
END $$;
DROP TABLE cardio_entries;
