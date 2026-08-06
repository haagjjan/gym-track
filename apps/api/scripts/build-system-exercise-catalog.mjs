import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_REVISION = "b0eed061e1c832b3ed815fbaa4b45b3cdc14df49";
const SOURCE_URL = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/${SOURCE_REVISION}/dist/exercises.json`;
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const apiDirectory = resolve(scriptDirectory, "..");
const catalogDirectory = resolve(apiDirectory, "catalog");
const featureDirectory = resolve(apiDirectory, "src/features/exercises");
const migrationPath = resolve(
  apiDirectory,
  "db/migrations/20260804120000000_expand_system_exercise_catalog_and_search.sql"
);
const legacyNamesPath = resolve(catalogDirectory, "legacy-exercise-names.json");
const manifestPath = resolve(catalogDirectory, "system-exercise-catalog.json");
const reviewPath = resolve(catalogDirectory, "system-exercise-catalog-review.json");
const runtimeManifestPath = resolve(featureDirectory, "system-exercise-catalog.json");

const categoryAllowlist = new Set([
  "strength",
  "powerlifting",
  "olympic weightlifting",
  "plyometrics"
]);
const compatibleStrongman = new Set([
  "Atlas Stone Trainer",
  "Atlas Stones",
  "Axle Deadlift",
  "Car Deadlift",
  "Circus Bell",
  "Log Lift",
  "Power Stairs",
  "Rickshaw Deadlift",
  "Tire Flip"
]);
const incompatibleDurationOrDistanceMovements = new Set([
  "Balance Board",
  "Bench Sprint",
  "Chest Push with Run Release",
  "Isometric Chest Squeezes",
  "Isometric Neck Exercise - Front And Back",
  "Isometric Neck Exercise - Sides",
  "Lunge Sprint",
  "Mountain Climbers",
  "Plank",
  "Plate Pinch",
  "Side Hop-Sprint",
  "Single-Cone Sprint Drill",
  "Sled Overhead Backward Walk",
  "Spider Crawl",
  "Wind Sprints"
]);
const muscleMap = {
  abdominals: "abs",
  abductors: "glutes",
  adductors: "quads",
  biceps: "biceps",
  calves: "calves",
  chest: "chest",
  forearms: "forearms",
  glutes: "glutes",
  hamstrings: "hamstrings",
  lats: "back",
  "lower back": "back",
  "middle back": "back",
  neck: "traps",
  quadriceps: "quads",
  shoulders: "shoulders",
  traps: "traps",
  triceps: "triceps"
};
const equipmentMap = {
  bands: "resistance band",
  barbell: "barbell",
  "body only": "bodyweight",
  cable: "cable",
  dumbbell: "dumbbell",
  "e-z curl bar": "EZ bar",
  "exercise ball": "stability ball",
  kettlebells: "kettlebell",
  machine: "machine",
  "medicine ball": "medicine ball",
  other: "other"
};

await mkdir(catalogDirectory, { recursive: true });
const legacyNames = await readLegacyNames();
const sourceRecords = await readSourceRecords();
const includedSource = [];
const exclusions = [];

for (const record of sourceRecords) {
  const exclusionReason = exclusionReasonFor(record);
  if (exclusionReason) {
    exclusions.push({
      sourceId: record.id,
      name: record.name,
      category: record.category,
      reason: exclusionReason
    });
    continue;
  }

  includedSource.push(toManifestRecord(record));
}

const byName = new Map();
for (const record of includedSource) {
  byName.set(normalizeLookup(record.name), record);
}
for (const name of legacyNames) {
  const key = normalizeLookup(name);
  const existing = byName.get(key);
  if (existing) {
    existing.origins = [...new Set([...existing.origins, "legacy-catalog"])];
    continue;
  }

  byName.set(key, inferLegacyRecord(name));
}

const records = [...byName.values()]
  .map((record) => ({ ...record, id: deterministicId(record.name) }))
  .sort((left, right) => left.name.localeCompare(right.name));
const manifest = {
  source: {
    name: "Free Exercise DB",
    repository: "https://github.com/yuhonas/free-exercise-db",
    revision: SOURCE_REVISION,
    license: "Unlicense",
    importedFields: ["name", "equipment", "mechanic", "primaryMuscles", "secondaryMuscles", "category"]
  },
  generatedAt: "2026-08-04T00:00:00.000Z",
  records
};
const review = {
  sourceRevision: SOURCE_REVISION,
  sourceRecordCount: sourceRecords.length,
  includedSourceRecordCount: includedSource.length,
  legacyCatalogNameCount: legacyNames.length,
  finalRecordCount: records.length,
  exclusionCount: exclusions.length,
  exclusions
};

await writeJson(legacyNamesPath, legacyNames);
await writeJson(manifestPath, manifest);
await writeJson(reviewPath, review);
await writeJson(runtimeManifestPath, manifest);
await writeFile(migrationPath, buildMigration(records), "utf8");
await splitLegacyNameModule();

console.log(JSON.stringify(review, null, 2));

async function readLegacyNames() {
  try {
    return JSON.parse(await readFile(legacyNamesPath, "utf8"));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  const catalogSource = await readFile(
    resolve(featureDirectory, "exercise-name-catalog.ts"),
    "utf8"
  );
  const match = catalogSource.match(/canonicalExerciseNames\s*=\s*\[([\s\S]*?)\]\s*as const/);
  if (!match) throw new Error("Could not extract the legacy exercise-name catalog.");
  return [...match[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((item) =>
    JSON.parse(`"${item[1]}"`)
  );
}

async function readSourceRecords() {
  const localPath = process.env.FREE_EXERCISE_DB_JSON;
  if (localPath) return JSON.parse(await readFile(localPath, "utf8"));

  const response = await fetch(SOURCE_URL);
  if (!response.ok) throw new Error(`Free Exercise DB download failed: ${response.status}`);
  return response.json();
}

async function splitLegacyNameModule() {
  const sourcePath = resolve(featureDirectory, "exercise-name-catalog.ts");
  const source = await readFile(sourcePath, "utf8");
  if (!source.includes("blockedExerciseNames")) return;

  const priority = extractStringArray(source, "priorityExerciseNames");
  const blockedNames = extractStringArray(source, "blockedExerciseNames");
  const blockedFragments = extractStringArray(source, "blockedExerciseWordFragments");
  await writeJson(resolve(catalogDirectory, "priority-exercise-names.json"), priority);
  await writeFile(
    resolve(featureDirectory, "exercise-name-blocklist.ts"),
    `export const blockedExerciseNames = ${JSON.stringify(blockedNames, null, 2)} as const;\n\nexport const blockedExerciseWordFragments = ${JSON.stringify(unique(blockedFragments), null, 2)} as const;\n`,
    "utf8"
  );
  await writeFile(
    sourcePath,
    `import manifest from "./system-exercise-catalog.json" with { type: "json" };\n\nexport interface SystemExerciseCatalogRecord {\n  id: string;\n  name: string;\n  equipment: string;\n  exerciseType: "compound" | "isolation" | "isometric" | "other";\n  primaryMuscleGroupSlugs: string[];\n  secondaryMuscleGroupSlugs: string[];\n  origins: string[];\n  sourceIds: string[];\n}\n\nexport const systemExerciseCatalog = manifest.records as SystemExerciseCatalogRecord[];\nexport const canonicalExerciseNames = systemExerciseCatalog.map((record) => record.name);\nexport const priorityExerciseNames = ${JSON.stringify(priority, null, 2)} as const;\nexport const systemExerciseCatalogSource = manifest.source;\n`,
    "utf8"
  );
}

function extractStringArray(source, variableName) {
  const match = source.match(new RegExp(`${variableName}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*as const`));
  if (!match) throw new Error(`Could not extract ${variableName}.`);
  return [...match[1].matchAll(/"((?:[^"\\\\]|\\\\.)*)"/g)].map((item) =>
    JSON.parse(`"${item[1]}"`)
  );
}

function exclusionReasonFor(record) {
  if (record.category === "cardio") return "cardio_requires_duration_or_distance_model";
  if (record.category === "stretching") return "stretching_requires_duration_model";
  if (record.category === "strongman" && !compatibleStrongman.has(record.name)) {
    return "strongman_movement_requires_duration_or_distance_model";
  }
  if (incompatibleDurationOrDistanceMovements.has(record.name)) {
    return "movement_requires_duration_or_distance_model";
  }
  if (!categoryAllowlist.has(record.category) && record.category !== "strongman") {
    return "category_not_reviewed_for_weight_and_reps_logging";
  }
  if (record.equipment === "foam roll") return "foam_roll_requires_duration_model";
  return null;
}

function toManifestRecord(record) {
  const primaryMuscleGroupSlugs = unique(record.primaryMuscles.map(mapMuscle));
  const secondaryMuscleGroupSlugs = unique(record.secondaryMuscles.map(mapMuscle)).filter(
    (slug) => !primaryMuscleGroupSlugs.includes(slug)
  );
  return {
    name: normalizeHumanName(record.name),
    equipment: mapEquipment(record.equipment),
    exerciseType: inferExerciseType(record.name, record.mechanic),
    primaryMuscleGroupSlugs,
    secondaryMuscleGroupSlugs,
    origins: ["free-exercise-db"],
    sourceIds: [record.id]
  };
}

function inferLegacyRecord(name) {
  const primary = inferPrimaryMuscle(name);
  return {
    name,
    equipment: inferEquipment(name),
    exerciseType: inferExerciseType(name, null),
    primaryMuscleGroupSlugs: [primary],
    secondaryMuscleGroupSlugs: inferSecondaryMuscles(name, primary),
    origins: ["legacy-catalog"],
    sourceIds: []
  };
}

function normalizeHumanName(name) {
  return name
    .trim()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\bE-Z\b/gi, "EZ")
    .replace(/Dumbell/gi, "Dumbbell")
    .replace(/Kettle Bell/gi, "Kettlebell");
}

function normalizeLookup(name) {
  return normalizeHumanName(name).toLowerCase().replace(/[’]/g, "'");
}

function mapMuscle(muscle) {
  const mapped = muscleMap[muscle];
  if (!mapped) throw new Error(`Unmapped muscle: ${muscle}`);
  return mapped;
}

function mapEquipment(equipment) {
  if (equipment === null) return "other";
  const mapped = equipmentMap[equipment];
  if (!mapped) throw new Error(`Unmapped equipment: ${equipment}`);
  return mapped;
}

function inferEquipment(name) {
  const value = name.toLowerCase();
  if (/ez[- ]?bar/.test(value)) return "EZ bar";
  if (/smith machine/.test(value)) return "Smith machine";
  if (/dumbbell/.test(value)) return "dumbbell";
  if (/barbell|high-bar/.test(value)) return "barbell";
  if (/kettlebell/.test(value)) return "kettlebell";
  if (/cable|pulldown|pushdown|pallof/.test(value)) return "cable";
  if (/machine|leg press|hack squat|pec deck|leg extension|leg curl/.test(value)) return "machine";
  if (/weighted/.test(value)) return "other";
  if (/push-up|pull-up|dip|plank|crunch|dead bug|nordic/.test(value)) return "bodyweight";
  return "other";
}

function inferExerciseType(name, mechanic) {
  if (/plank|hold|isometric/i.test(name)) return "isometric";
  if (mechanic === "compound") return "compound";
  if (mechanic === "isolation") return "isolation";
  if (/squat|deadlift|press|row|pull-up|push-up|dip|lunge|step-up|thrust|bridge|good morning|clean|snatch|jerk|swing/i.test(name)) return "compound";
  if (/curl|raise|fly|extension|pushdown|pulldown|shrug|crunch|abduction|adduction/i.test(name)) return "isolation";
  return "other";
}

function inferPrimaryMuscle(name) {
  const value = name.toLowerCase();
  if (/calf/.test(value)) return "calves";
  if (/curl/.test(value) && !/leg|hamstring|nordic/.test(value)) return "biceps";
  if (/triceps|skull|pushdown|jm press/.test(value)) return "triceps";
  if (/bench|chest|pec|push-up|fly/.test(value)) return "chest";
  if (/row|pulldown|pull-up|chin-up|pullover|back extension/.test(value)) return "back";
  if (/shoulder|overhead|military|lateral|front raise|rear delt|face pull|upright|arnold|landmine press/.test(value)) return "shoulders";
  if (/shrug/.test(value)) return "traps";
  if (/hamstring|leg curl|romanian|stiff-leg|good morning|nordic/.test(value)) return "hamstrings";
  if (/hip thrust|glute|abduction/.test(value)) return "glutes";
  if (/squat|lunge|leg press|leg extension|step-up|adduction/.test(value)) return "quads";
  if (/wrist|forearm/.test(value)) return "forearms";
  if (/crunch|plank|raise|rollout|dead bug|wood chop|pallof|twist/.test(value)) return "abs";
  if (/deadlift/.test(value)) return "back";
  return "abs";
}

function inferSecondaryMuscles(name, primary) {
  const value = name.toLowerCase();
  const muscles = [];
  if (/squat|lunge|step-up|deadlift|thrust|bridge/.test(value)) muscles.push("glutes");
  if (/squat|lunge|step-up|deadlift/.test(value)) muscles.push("hamstrings", "quads");
  if (/press|push-up|dip/.test(value)) muscles.push("triceps");
  if (/row|pull-up|pulldown|chin-up/.test(value)) muscles.push("biceps");
  return unique(muscles).filter((muscle) => muscle !== primary);
}

function deterministicId(name) {
  const hash = createHash("sha256").update(`gym-progress-tracker:${normalizeLookup(name)}`).digest("hex");
  return `10000000-${hash.slice(0, 4)}-4${hash.slice(5, 8)}-8${hash.slice(9, 12)}-${hash.slice(12, 24)}`;
}

function unique(values) {
  return [...new Set(values)];
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sqlLiteral(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function buildMigration(records) {
  const rows = records.map((record) => ({
    id: record.id,
    name: record.name,
    equipment: record.equipment,
    exerciseType: record.exerciseType,
    primary: record.primaryMuscleGroupSlugs,
    secondary: record.secondaryMuscleGroupSlugs
  }));
  const payload = sqlLiteral(JSON.stringify(rows));
  return `-- Up Migration

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- A fresh all-migrations transaction can carry deferred trigger events from
-- the preceding seed. Flush them before altering the exercises table.
SET CONSTRAINTS ALL IMMEDIATE;

ALTER TABLE exercises DROP CONSTRAINT exercises_equipment_check;
ALTER TABLE exercises
  ADD CONSTRAINT exercises_equipment_check
  CHECK (equipment IS NULL OR equipment IN (
    'barbell', 'dumbbell', 'kettlebell', 'cable', 'machine',
    'plate-loaded machine', 'Smith machine', 'resistance band', 'bodyweight',
    'EZ bar', 'medicine ball', 'stability ball', 'other'
  ));

CREATE INDEX exercises_name_lower_trgm_idx
  ON exercises USING gin (lower(name) gin_trgm_ops)
  WHERE deleted_at IS NULL;

SET CONSTRAINTS ALL DEFERRED;

CREATE TEMP TABLE catalog_import ON COMMIT DROP AS
SELECT *
FROM jsonb_to_recordset(${payload}::jsonb) AS catalog(
  id uuid,
  name text,
  equipment text,
  "exerciseType" text,
  "primary" jsonb,
  "secondary" jsonb
);

DO $$
DECLARE conflict_names text;
BEGIN
  SELECT string_agg(catalog.name, ', ' ORDER BY catalog.name)
  INTO conflict_names
  FROM catalog_import catalog
  JOIN exercises existing ON lower(existing.name) = lower(catalog.name)
  WHERE existing.created_by_user_id IS NOT NULL;

  IF conflict_names IS NOT NULL THEN
    RAISE NOTICE 'System exercise catalog preserved user-owned conflicts for manual review: %', conflict_names;
  END IF;
END $$;

INSERT INTO exercises (
  id, name, equipment, exercise_type, primary_muscle_group_id, created_by_user_id
)
SELECT
  catalog.id,
  catalog.name,
  catalog.equipment,
  catalog."exerciseType",
  primary_group.id,
  NULL
FROM catalog_import catalog
JOIN LATERAL jsonb_array_elements_text(catalog."primary") primary_slug ON true
JOIN muscle_groups primary_group ON primary_group.slug = primary_slug
WHERE primary_slug = catalog."primary"->>0
  AND NOT EXISTS (
    SELECT 1 FROM exercises existing WHERE lower(existing.name) = lower(catalog.name)
  );

UPDATE exercises
SET
  equipment = catalog.equipment,
  exercise_type = catalog."exerciseType",
  updated_at = now()
FROM catalog_import catalog
WHERE exercises.id = catalog.id
  AND exercises.created_by_user_id IS NULL;

INSERT INTO exercise_muscle_groups (exercise_id, muscle_group_id, role)
SELECT catalog.id, muscle_groups.id, 'PRIMARY'
FROM catalog_import catalog
JOIN exercises ON exercises.id = catalog.id AND exercises.created_by_user_id IS NULL
JOIN LATERAL jsonb_array_elements_text(catalog."primary") muscle_slug ON true
JOIN muscle_groups ON muscle_groups.slug = muscle_slug
ON CONFLICT (exercise_id, muscle_group_id) DO UPDATE SET role = 'PRIMARY';

INSERT INTO exercise_muscle_groups (exercise_id, muscle_group_id, role)
SELECT catalog.id, muscle_groups.id, 'SECONDARY'
FROM catalog_import catalog
JOIN exercises ON exercises.id = catalog.id AND exercises.created_by_user_id IS NULL
JOIN LATERAL jsonb_array_elements_text(catalog."secondary") muscle_slug ON true
JOIN muscle_groups ON muscle_groups.slug = muscle_slug
ON CONFLICT (exercise_id, muscle_group_id) DO NOTHING;

INSERT INTO exercise_secondary_muscles (exercise_id, muscle_group_id)
SELECT catalog.id, muscle_groups.id
FROM catalog_import catalog
JOIN exercises ON exercises.id = catalog.id AND exercises.created_by_user_id IS NULL
JOIN LATERAL jsonb_array_elements_text(catalog."secondary") muscle_slug ON true
JOIN muscle_groups ON muscle_groups.slug = muscle_slug
ON CONFLICT (exercise_id, muscle_group_id) DO NOTHING;

-- Down Migration

CREATE TEMP TABLE catalog_delete_candidates ON COMMIT DROP AS
SELECT id
FROM exercises
WHERE id::text LIKE '10000000-%'
  AND NOT EXISTS (
    SELECT 1 FROM session_exercises WHERE session_exercises.exercise_id = exercises.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM workout_template_exercises WHERE workout_template_exercises.exercise_id = exercises.id
  );

DELETE FROM exercise_secondary_muscles
WHERE exercise_id IN (SELECT id FROM catalog_delete_candidates);

DELETE FROM exercise_muscle_groups
WHERE exercise_id IN (SELECT id FROM catalog_delete_candidates);

DELETE FROM exercises
WHERE id IN (SELECT id FROM catalog_delete_candidates);

DROP INDEX exercises_name_lower_trgm_idx;
UPDATE exercises
SET equipment = 'other'
WHERE id::text LIKE '10000000-%'
  AND equipment IN ('EZ bar', 'medicine ball', 'stability ball');
SET CONSTRAINTS ALL IMMEDIATE;
ALTER TABLE exercises DROP CONSTRAINT exercises_equipment_check;
ALTER TABLE exercises
  ADD CONSTRAINT exercises_equipment_check
  CHECK (equipment IS NULL OR equipment IN (
    'barbell', 'dumbbell', 'kettlebell', 'cable', 'machine',
    'plate-loaded machine', 'Smith machine', 'resistance band', 'bodyweight', 'other'
  ));
`;
}
