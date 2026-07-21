import { sql, type Kysely, type RawBuilder, type Transaction } from "kysely";
import type { AppDatabase } from "../../db/database.js";
import type {
  NewTemplate,
  TemplateListFilters,
  TemplateRecord
} from "./template.repository.js";

type DbExecutor = Kysely<AppDatabase> | Transaction<AppDatabase>;
type TemplateBase = Omit<TemplateRecord, "exercises" | "lastUsedAt">;

export const templateSelection = [
  "id",
  "user_id as userId",
  "name",
  "created_at as createdAt",
  "updated_at as updatedAt"
] as const;

export async function findTemplate(
  db: DbExecutor,
  userId: string,
  id: string
): Promise<TemplateRecord | null> {
  const base = await findTemplateBase(db, userId, id);
  return base ? (await hydrateTemplates(db, [base]))[0] ?? null : null;
}

export async function findTemplateBase(
  db: DbExecutor,
  userId: string,
  id: string
): Promise<TemplateBase | null> {
  const row = await db
    .selectFrom("workout_templates")
    .select(templateSelection)
    .where("id", "=", id)
    .where("user_id", "=", userId)
    .executeTakeFirst();
  return row ? { ...row } : null;
}

export async function findTemplateOrThrow(
  db: DbExecutor,
  userId: string,
  id: string
): Promise<TemplateRecord> {
  const template = await findTemplate(db, userId, id);
  if (!template) throw new Error("Template disappeared after write.");
  return template;
}

export async function hydrateTemplates(
  db: DbExecutor,
  templates: TemplateBase[]
): Promise<TemplateRecord[]> {
  if (templates.length === 0) return [];
  const ids = templates.map((template) => template.id);
  const entries = await db
    .selectFrom("workout_template_exercises")
    .innerJoin("exercises", "exercises.id", "workout_template_exercises.exercise_id")
    .select([
      "workout_template_exercises.id as id",
      "workout_template_exercises.workout_template_id as templateId",
      "workout_template_exercises.position as position",
      "exercises.id as exerciseId",
      "exercises.name as exerciseName",
      "exercises.equipment as equipment",
      "exercises.exercise_type as exerciseType"
    ])
    .where("workout_template_exercises.workout_template_id", "in", ids)
    .orderBy("workout_template_exercises.position", "asc")
    .execute();
  const exerciseIds = [...new Set(entries.map((entry) => entry.exerciseId))];
  const muscles = exerciseIds.length === 0 ? [] : await db
    .selectFrom("exercise_muscle_groups")
    .innerJoin("muscle_groups", "muscle_groups.id", "exercise_muscle_groups.muscle_group_id")
    .select([
      "exercise_muscle_groups.exercise_id as exerciseId",
      "exercise_muscle_groups.role as role",
      "muscle_groups.id as id",
      "muscle_groups.slug as slug",
      "muscle_groups.name as name",
      "muscle_groups.sort_order as sortOrder"
    ])
    .where("exercise_muscle_groups.exercise_id", "in", exerciseIds)
    .orderBy("muscle_groups.sort_order", "asc")
    .execute();
  const lastUsed = await findLastUsedBySignature(db, templates, entries);

  return templates.map((template) => ({
    ...template,
    lastUsedAt: lastUsed.get(template.id) ?? null,
    exercises: entries
      .filter((entry) => entry.templateId === template.id)
      .map((entry) => ({
        id: entry.id,
        position: entry.position,
        exercise: {
          id: entry.exerciseId,
          name: entry.exerciseName,
          equipment: entry.equipment,
          exerciseType: entry.exerciseType,
          muscleGroups: muscles
            .filter((muscle) => muscle.exerciseId === entry.exerciseId)
            .map((muscle) => ({
              id: muscle.id,
              slug: muscle.slug,
              name: muscle.name,
              role: muscle.role,
              sortOrder: muscle.sortOrder
            }))
        }
      }))
  }));
}

export async function insertTemplate(db: DbExecutor, input: NewTemplate): Promise<void> {
  await db.insertInto("workout_templates").values({
    id: input.id,
    user_id: input.userId,
    name: input.name,
    created_at: input.createdAt,
    updated_at: input.createdAt
  }).execute();
  await replaceTemplateExercises(db, input.id, input.exerciseIds);
}

export async function replaceTemplateExercises(
  db: DbExecutor,
  templateId: string,
  exerciseIds: string[]
): Promise<void> {
  await db.deleteFrom("workout_template_exercises")
    .where("workout_template_id", "=", templateId)
    .execute();
  if (exerciseIds.length === 0) return;
  await db.insertInto("workout_template_exercises").values(
    exerciseIds.map((exerciseId, index) => ({
      id: crypto.randomUUID(),
      workout_template_id: templateId,
      exercise_id: exerciseId,
      position: index + 1
    }))
  ).execute();
}

export async function listTemplateExerciseIds(
  db: DbExecutor,
  templateId: string
): Promise<string[]> {
  const rows = await db.selectFrom("workout_template_exercises")
    .select("exercise_id as exerciseId")
    .where("workout_template_id", "=", templateId)
    .orderBy("position", "asc")
    .execute();
  return rows.map((row) => row.exerciseId);
}

export async function listCompletedWorkoutExerciseIds(
  db: DbExecutor,
  userId: string,
  workoutId: string
): Promise<string[] | null> {
  const workout = await db.selectFrom("workout_sessions")
    .select("id")
    .where("id", "=", workoutId)
    .where("user_id", "=", userId)
    .where("ended_at", "is not", null)
    .where("deleted_at", "is", null)
    .executeTakeFirst();
  if (!workout) return null;
  const rows = await db.selectFrom("session_exercises")
    .select("exercise_id as exerciseId")
    .where("workout_session_id", "=", workoutId)
    .where("deleted_at", "is", null)
    .orderBy("position", "asc")
    .execute();
  return rows.map((row) => row.exerciseId);
}

export async function insertSessionExercises(
  db: DbExecutor,
  workoutId: string,
  exerciseIds: string[]
): Promise<void> {
  if (exerciseIds.length === 0) return;
  await db.insertInto("session_exercises").values(
    exerciseIds.map((exerciseId, index) => ({
      id: crypto.randomUUID(),
      workout_session_id: workoutId,
      exercise_id: exerciseId,
      position: index + 1
    }))
  ).execute();
}

export function templateFilterExpression(filters: TemplateListFilters): RawBuilder<boolean> {
  const clauses: RawBuilder<unknown>[] = [];
  if (filters.search) {
    const pattern = `%${filters.search.toLowerCase()}%`;
    clauses.push(sql`(
      lower(workout_templates.name) like ${pattern}
      or exists (
        select 1 from workout_template_exercises search_te
        join exercises search_e on search_e.id = search_te.exercise_id
        where search_te.workout_template_id = workout_templates.id
          and lower(search_e.name) like ${pattern}
      )
    )`);
  }

  const facets = filters.muscleGroupIds.map((muscleGroupId) => sql`exists (
    select 1 from exercise_muscle_groups facet_emg
    where facet_emg.exercise_id = facet_e.id
      and facet_emg.muscle_group_id = ${muscleGroupId}
  )`);
  if (filters.equipment === "unspecified") facets.push(sql`facet_e.equipment is null`);
  else if (filters.equipment) facets.push(sql`facet_e.equipment = ${filters.equipment}`);
  if (filters.exerciseType === "unspecified") facets.push(sql`facet_e.exercise_type is null`);
  else if (filters.exerciseType) facets.push(sql`facet_e.exercise_type = ${filters.exerciseType}`);
  if (facets.length > 0) {
    clauses.push(sql`exists (
      select 1 from workout_template_exercises facet_te
      join exercises facet_e on facet_e.id = facet_te.exercise_id
      where facet_te.workout_template_id = workout_templates.id
        and facet_e.deleted_at is null
        and ${sql.join(facets, sql` and `)}
    )`);
  }

  return clauses.length > 0
    ? sql<boolean>`${sql.join(clauses, sql` and `)}`
    : sql<boolean>`true`;
}

export function sortTemplates(
  templates: TemplateRecord[],
  sort: TemplateListFilters["sort"]
): TemplateRecord[] {
  return [...templates].sort((left, right) => {
    if (sort === "name") return left.name.localeCompare(right.name);
    if (sort === "lastEdited") return right.updatedAt.getTime() - left.updatedAt.getTime();
    const dateDifference = (right.lastUsedAt?.getTime() ?? 0) - (left.lastUsedAt?.getTime() ?? 0);
    return dateDifference || left.name.localeCompare(right.name);
  });
}

async function findLastUsedBySignature(
  db: DbExecutor,
  templates: TemplateBase[],
  entries: Array<{ templateId: string; exerciseId: string }>
): Promise<Map<string, Date>> {
  const result = new Map<string, Date>();
  const userIds = [...new Set(templates.map((template) => template.userId))];
  if (userIds.length === 0) return result;

  const rows = await db.selectFrom("workout_sessions")
    .leftJoin("session_exercises", (join) => join
      .onRef("session_exercises.workout_session_id", "=", "workout_sessions.id")
      .on("session_exercises.deleted_at", "is", null))
    .select([
      "workout_sessions.id as workoutId",
      "workout_sessions.user_id as userId",
      "workout_sessions.started_at as startedAt",
      "session_exercises.exercise_id as exerciseId"
    ])
    .where("workout_sessions.user_id", "in", userIds)
    .where("workout_sessions.ended_at", "is not", null)
    .where("workout_sessions.deleted_at", "is", null)
    .execute();
  const workouts = new Map<string, { userId: string; startedAt: Date; exerciseIds: string[] }>();

  for (const row of rows) {
    const workout = workouts.get(row.workoutId) ?? {
      userId: row.userId,
      startedAt: row.startedAt,
      exerciseIds: []
    };
    if (row.exerciseId) workout.exerciseIds.push(row.exerciseId);
    workouts.set(row.workoutId, workout);
  }

  const latestBySignature = new Map<string, Date>();
  for (const workout of workouts.values()) {
    const key = `${workout.userId}:${exerciseSignature(workout.exerciseIds)}`;
    const existing = latestBySignature.get(key);
    if (!existing || workout.startedAt > existing) latestBySignature.set(key, workout.startedAt);
  }
  for (const template of templates) {
    const exerciseIds = entries
      .filter((entry) => entry.templateId === template.id)
      .map((entry) => entry.exerciseId);
    const date = latestBySignature.get(`${template.userId}:${exerciseSignature(exerciseIds)}`);
    if (date) result.set(template.id, date);
  }
  return result;
}

export function exerciseSignature(exerciseIds: string[]): string {
  return [...exerciseIds].sort().join("|");
}

export function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
