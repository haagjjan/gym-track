import { createHash, randomUUID } from "node:crypto";
import { sql, type Kysely, type Transaction } from "kysely";
import type { AppDatabase } from "../../db/database.js";
import { lockOwnedWorkout } from "../workouts/workout-logging.repository.helpers.js";
import type { TimedValues, CardioValues } from "./tracking.schemas.js";

export type TrackingKind = "timed_sets" | "cardio_entries";
type Db = Kysely<AppDatabase> | Transaction<AppDatabase>;
type Result<T> = { ok: true; value: T; replayed?: boolean } | { ok: false; reason: "not_found" | "conflict" };

export function createTrackingRepository(db: Kysely<AppDatabase>) {
  return {
    async catalog() {
      return db.selectFrom("exercises").select(["id", "name", "tracking_mode as trackingMode"])
        .where("tracking_mode", "<>", "reps").where("deleted_at", "is", null).orderBy("name").execute();
    },
    async workout(userId: string, workoutId: string) {
      const owned = await db.selectFrom("workout_sessions").select("id").where("id", "=", workoutId)
        .where("user_id", "=", userId).where("deleted_at", "is", null).executeTakeFirst();
      if (!owned) return null;
      const [timedSets, cardioEntries] = await Promise.all([
        timedRows(db, userId).where("timed_sets.workout_session_id", "=", workoutId)
          .where("timed_sets.deleted_at", "is", null).orderBy("timed_sets.created_at").orderBy("timed_sets.id").execute(),
        cardioRows(db, userId).where("cardio_entries.workout_session_id", "=", workoutId)
          .where("cardio_entries.deleted_at", "is", null).orderBy("cardio_entries.created_at").orderBy("cardio_entries.id").execute()
      ]);
      return { timedSets, cardioEntries };
    },
    createTimed: (userId: string, workoutId: string, id: string, values: TimedValues) =>
      createEntry(db, { kind: "timed_sets", values }, userId, workoutId, id),
    createCardio: (userId: string, workoutId: string, id: string, values: CardioValues) =>
      createEntry(db, { kind: "cardio_entries", values }, userId, workoutId, id),
    updateTimed: (userId: string, workoutId: string, id: string, revision: number, values: TimedValues) =>
      changeEntry(db, "timed_sets", userId, workoutId, id, revision, { kind: "timed_sets", values }),
    updateCardio: (userId: string, workoutId: string, id: string, revision: number, values: CardioValues) =>
      changeEntry(db, "cardio_entries", userId, workoutId, id, revision, { kind: "cardio_entries", values }),
    remove: (kind: TrackingKind, userId: string, workoutId: string, id: string, revision: number) =>
      changeEntry(db, kind, userId, workoutId, id, revision, null),
    async progress(userId: string) {
      const [timedSets, cardioEntries] = await Promise.all([
        timedRows(db, userId).where("timed_sets.deleted_at", "is", null)
          .where("workout_sessions.deleted_at", "is", null).where("workout_sessions.ended_at", "is not", null)
          .where("timed_sets.set_type", "=", "working").orderBy("workout_sessions.started_at").orderBy("timed_sets.created_at").orderBy("timed_sets.id").execute(),
        cardioRows(db, userId).where("cardio_entries.deleted_at", "is", null)
          .where("workout_sessions.deleted_at", "is", null).where("workout_sessions.ended_at", "is not", null)
          .orderBy("workout_sessions.started_at").orderBy("cardio_entries.created_at").orderBy("cardio_entries.id").execute()
      ]);
      return { timedSets, cardioEntries };
    }
  };
}

function timedRows(db: Db, userId: string) {
  return db.selectFrom("timed_sets").innerJoin("workout_sessions", "workout_sessions.id", "timed_sets.workout_session_id")
    .innerJoin("exercises", "exercises.id", "timed_sets.exercise_id").where("workout_sessions.user_id", "=", userId)
    .select(["timed_sets.id", "timed_sets.workout_session_id as workoutId", "timed_sets.exercise_id as exerciseId",
      "exercises.name as exerciseName", "timed_sets.duration_seconds as durationSeconds", "timed_sets.added_weight_kg as addedWeightKg",
      "timed_sets.set_type as setType", "timed_sets.note", "timed_sets.revision", "timed_sets.created_at as createdAt",
      "timed_sets.updated_at as updatedAt", "timed_sets.deleted_at as deletedAt", "workout_sessions.started_at as sessionDate"]);
}
function cardioRows(db: Db, userId: string) {
  // `activity` is the exercise name; entries from before cardio exercises keep their own.
  return db.selectFrom("cardio_entries").innerJoin("workout_sessions", "workout_sessions.id", "cardio_entries.workout_session_id")
    .leftJoin("exercises", "exercises.id", "cardio_entries.exercise_id")
    .where("workout_sessions.user_id", "=", userId)
    .select(["cardio_entries.id", "cardio_entries.workout_session_id as workoutId", "cardio_entries.exercise_id as exerciseId",
      sql<string>`coalesce(exercises.name, cardio_entries.activity)`.as("activity"),
      "cardio_entries.duration_seconds as durationSeconds", "cardio_entries.distance_metres as distanceMetres",
      "cardio_entries.average_heart_rate as averageHeartRate", "cardio_entries.calories", "cardio_entries.note", "cardio_entries.revision",
      "cardio_entries.created_at as createdAt", "cardio_entries.updated_at as updatedAt", "cardio_entries.deleted_at as deletedAt",
      "workout_sessions.started_at as sessionDate"]);
}
async function findEntry(db: Db, kind: TrackingKind, userId: string, id: string) {
  return kind === "timed_sets" ? timedRows(db, userId).where("timed_sets.id", "=", id).executeTakeFirst()
    : cardioRows(db, userId).where("cardio_entries.id", "=", id).executeTakeFirst();
}
type Entry = { kind: "timed_sets"; values: TimedValues } | { kind: "cardio_entries"; values: CardioValues };
function timedFields(values: TimedValues) {
  return { duration_seconds: values.durationSeconds, note: values.note, exercise_id: values.exerciseId, set_type: values.setType, added_weight_kg: values.addedWeightKg };
}
function cardioFields(values: CardioValues, activity: string) {
  return { duration_seconds: values.durationSeconds, note: values.note, exercise_id: values.exerciseId, activity,
    distance_metres: values.distanceMetres, average_heart_rate: values.averageHeartRate, calories: values.calories };
}
/** The exercise must exist in the entry's own mode: time sets on time exercises, cardio on cardio. */
async function exerciseName(db: Db, entry: Entry): Promise<string | null> {
  const row = await db.selectFrom("exercises").select("name").where("id", "=", entry.values.exerciseId)
    .where("tracking_mode", "=", entry.kind === "timed_sets" ? "time" : "cardio").where("deleted_at", "is", null).executeTakeFirst();
  return row?.name ?? null;
}
/** An entry always shows under its exercise in the workout, so the exercise is added when missing. */
export async function ensureSessionExercise(db: Db, workoutId: string, exerciseId: string, at = new Date()): Promise<void> {
  const present = await db.selectFrom("session_exercises").select("id").where("workout_session_id", "=", workoutId)
    .where("exercise_id", "=", exerciseId).where("deleted_at", "is", null).executeTakeFirst();
  if (present) return;
  const last = await db.selectFrom("session_exercises").select((eb) => eb.fn.max("position").as("position"))
    .where("workout_session_id", "=", workoutId).where("deleted_at", "is", null).executeTakeFirst();
  await db.insertInto("session_exercises").values({ id: randomUUID(), workout_session_id: workoutId, exercise_id: exerciseId,
    position: (last?.position ?? 0) + 1, created_at: at, updated_at: at }).execute();
}
async function createEntry(db: Kysely<AppDatabase>, entry: Entry, userId: string, workoutId: string,
  id: string): Promise<Result<NonNullable<Awaited<ReturnType<typeof findEntry>>>>> {
  const { kind } = entry;
  return db.transaction().execute(async (trx) => {
    const name = await exerciseName(trx, entry);
    const fields = entry.kind === "timed_sets" ? timedFields(entry.values) : cardioFields(entry.values, name ?? "");
    const fingerprint = createHash("sha256").update(JSON.stringify({ kind, workoutId, ...fields, activity: undefined })).digest("hex");
    const stored = () => trx.selectFrom(kind).innerJoin("workout_sessions", "workout_sessions.id", `${kind}.workout_session_id`)
      .select(`${kind}.create_fingerprint as fingerprint`).where(`${kind}.id`, "=", id)
      .where("workout_sessions.user_id", "=", userId).executeTakeFirst();
    const replay = await stored();
    if (replay) return replay.fingerprint === fingerprint
      ? { ok: true, replayed: true, value: (await findEntry(trx, kind, userId, id))! } : { ok: false, reason: "conflict" };
    if (!(await lockOwnedWorkout(trx, userId, workoutId)) || name === null) return { ok: false, reason: "not_found" };
    await ensureSessionExercise(trx, workoutId, entry.values.exerciseId);
    const common = { id, workout_session_id: workoutId, create_fingerprint: fingerprint };
    const row = entry.kind === "timed_sets"
      ? await trx.insertInto("timed_sets").values({ ...common, ...timedFields(entry.values) })
        .onConflict((conflict) => conflict.column("id").doNothing()).returning("id").executeTakeFirst()
      : await trx.insertInto("cardio_entries").values({ ...common, ...cardioFields(entry.values, name) })
        .onConflict((conflict) => conflict.column("id").doNothing()).returning("id").executeTakeFirst();
    if (row) return { ok: true, replayed: false, value: (await findEntry(trx, kind, userId, id))! };
    const raced = await stored();
    return raced?.fingerprint === fingerprint
      ? { ok: true, replayed: true, value: (await findEntry(trx, kind, userId, id))! } : { ok: false, reason: "conflict" };
  });
}
async function changeEntry(db: Kysely<AppDatabase>, kind: TrackingKind, userId: string, workoutId: string,
  id: string, revision: number, change: Entry | null): Promise<Result<NonNullable<Awaited<ReturnType<typeof findEntry>>>>> {
  return db.transaction().execute(async (trx) => {
    if (!(await lockOwnedWorkout(trx, userId, workoutId))) return { ok: false, reason: "not_found" };
    const entry = await findEntry(trx, kind, userId, id);
    if (!entry || entry.workoutId !== workoutId) return { ok: false, reason: "not_found" };
    if (entry.revision !== revision || entry.deletedAt) return { ok: false, reason: "conflict" };
    const stamp = { revision: sql<number>`revision + 1`, updated_at: new Date() };
    if (!change) {
      await trx.updateTable(kind).set({ ...stamp, deleted_at: new Date() }).where("id", "=", id).execute();
    } else {
      const name = await exerciseName(trx, change);
      if (name === null) return { ok: false, reason: "not_found" };
      await ensureSessionExercise(trx, workoutId, change.values.exerciseId);
      if (change.kind === "timed_sets") await trx.updateTable("timed_sets").set({ ...stamp, ...timedFields(change.values) }).where("id", "=", id).execute();
      else await trx.updateTable("cardio_entries").set({ ...stamp, ...cardioFields(change.values, name) }).where("id", "=", id).execute();
    }
    return { ok: true, value: (await findEntry(trx, kind, userId, id))! };
  });
}
export type TrackingRepository = ReturnType<typeof createTrackingRepository>;
