-- Up Migration

UPDATE exercises
SET equipment = CASE
  WHEN equipment IS NULL OR btrim(equipment) = '' THEN NULL
  WHEN lower(btrim(equipment)) IN ('barbell', 'bb') THEN 'barbell'
  WHEN lower(btrim(equipment)) IN ('dumbbell', 'dumbbells', 'db') THEN 'dumbbell'
  WHEN lower(btrim(equipment)) IN ('kettlebell', 'kettlebells', 'kb') THEN 'kettlebell'
  WHEN lower(btrim(equipment)) = 'cable' THEN 'cable'
  WHEN lower(btrim(equipment)) = 'machine' THEN 'machine'
  WHEN lower(btrim(equipment)) IN ('plate loaded', 'plate-loaded', 'plate loaded machine', 'plate-loaded machine')
    THEN 'plate-loaded machine'
  WHEN lower(btrim(equipment)) IN ('smith', 'smith machine') THEN 'Smith machine'
  WHEN lower(btrim(equipment)) IN ('band', 'bands', 'resistance band', 'resistance bands')
    THEN 'resistance band'
  WHEN lower(btrim(equipment)) IN ('body weight', 'bodyweight') THEN 'bodyweight'
  WHEN lower(btrim(equipment)) = 'other' THEN 'other'
  ELSE 'other'
END;

UPDATE exercises
SET exercise_type = CASE
  WHEN exercise_type IS NULL OR btrim(exercise_type) = '' THEN NULL
  WHEN lower(btrim(exercise_type)) = 'compound' THEN 'compound'
  WHEN lower(btrim(exercise_type)) = 'isolation' THEN 'isolation'
  WHEN lower(btrim(exercise_type)) = 'isometric' THEN 'isometric'
  WHEN lower(btrim(exercise_type)) = 'other' THEN 'other'
  ELSE 'other'
END;

-- Exercise classification changes enqueue the deferred "at least one primary
-- muscle" constraint trigger. Flush those events before altering the table;
-- PostgreSQL otherwise rejects the ALTER in this same migration transaction.
SET CONSTRAINTS ALL IMMEDIATE;

ALTER TABLE exercises
  ADD CONSTRAINT exercises_equipment_check
    CHECK (equipment IS NULL OR equipment IN (
      'barbell',
      'dumbbell',
      'kettlebell',
      'cable',
      'machine',
      'plate-loaded machine',
      'Smith machine',
      'resistance band',
      'bodyweight',
      'other'
    )),
  ADD CONSTRAINT exercises_exercise_type_check
    CHECK (exercise_type IS NULL OR exercise_type IN (
      'compound',
      'isolation',
      'isometric',
      'other'
    ));

ALTER TABLE users
  ADD COLUMN volume_heat_ceiling integer NOT NULL DEFAULT 20,
  ADD CONSTRAINT users_volume_heat_ceiling_check
    CHECK (volume_heat_ceiling BETWEEN 5 AND 50);

CREATE INDEX exercises_equipment_type_name_idx
  ON exercises (equipment, exercise_type, lower(name))
  WHERE deleted_at IS NULL;

-- Down Migration

DROP INDEX exercises_equipment_type_name_idx;
ALTER TABLE users DROP CONSTRAINT users_volume_heat_ceiling_check;
ALTER TABLE users DROP COLUMN volume_heat_ceiling;
ALTER TABLE exercises DROP CONSTRAINT exercises_exercise_type_check;
ALTER TABLE exercises DROP CONSTRAINT exercises_equipment_check;
