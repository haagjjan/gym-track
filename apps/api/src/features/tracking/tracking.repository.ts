import { createHash } from "node:crypto";
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
      return db.selectFrom("exercises").select(["id", "name"])
        .where("tracking_mode", "=", "time").where("deleted_at", "is", null).orderBy("name").execute();
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
      createEntry(db, "timed_sets", userId, workoutId, id, values),
    createCardio: (userId: string, workoutId: string, id: string, values: CardioValues) =>
      createEntry(db, "cardio_entries", userId, workoutId, id, values),
    updateTimed: (userId: string, workoutId: string, id: string, revision: number, values: TimedValues) =>
      changeEntry(db, "timed_sets", userId, workoutId, id, revision, values),
    updateCardio: (userId: string, workoutId: string, id: string, revision: number, values: CardioValues) =>
      changeEntry(db, "cardio_entries", userId, workoutId, id, revision, values),
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
  return db.selectFrom("cardio_entries").innerJoin("workout_sessions", "workout_sessions.id", "cardio_entries.workout_session_id")
    .where("workout_sessions.user_id", "=", userId)
    .select(["cardio_entries.id", "cardio_entries.workout_session_id as workoutId", "cardio_entries.activity",
      "cardio_entries.duration_seconds as durationSeconds", "cardio_entries.distance_metres as distanceMetres",
      "cardio_entries.average_heart_rate as averageHeartRate", "cardio_entries.note", "cardio_entries.revision",
      "cardio_entries.created_at as createdAt", "cardio_entries.updated_at as updatedAt", "cardio_entries.deleted_at as deletedAt",
      "workout_sessions.started_at as sessionDate"]);
}
async function findEntry(db: Db, kind: TrackingKind, userId: string, id: string) {
  return kind === "timed_sets" ? timedRows(db, userId).where("timed_sets.id", "=", id).executeTakeFirst()
    : cardioRows(db, userId).where("cardio_entries.id", "=", id).executeTakeFirst();
}
function fields(values: TimedValues | CardioValues) {
  const common = { duration_seconds: values.durationSeconds, note: values.note };
  return "exerciseId" in values ? { ...common, exercise_id: values.exerciseId, set_type: values.setType, added_weight_kg: values.addedWeightKg }
    : { ...common, activity: values.activity, distance_metres: values.distanceMetres, average_heart_rate: values.averageHeartRate };
}
async function validExercise(db: Db, values: TimedValues | CardioValues) {
  return !("exerciseId" in values) || Boolean(await db.selectFrom("exercises").select("id")
    .where("id", "=", values.exerciseId).where("tracking_mode", "=", "time").where("deleted_at", "is", null).executeTakeFirst());
}
async function createEntry(db: Kysely<AppDatabase>, kind: TrackingKind, userId: string, workoutId: string,
  id: string, values: TimedValues | CardioValues): Promise<Result<NonNullable<Awaited<ReturnType<typeof findEntry>>>>> {
  const fingerprint = createHash("sha256").update(JSON.stringify({ kind, workoutId, ...fields(values) })).digest("hex");
  return db.transaction().execute(async (trx) => {
    const replay = await trx.selectFrom(kind).innerJoin("workout_sessions", "workout_sessions.id", `${kind}.workout_session_id`)
      .select(`${kind}.create_fingerprint as fingerprint`).where(`${kind}.id`, "=", id)
      .where("workout_sessions.user_id", "=", userId).executeTakeFirst();
    if (replay) return replay.fingerprint === fingerprint
      ? { ok: true, replayed: true, value: (await findEntry(trx, kind, userId, id))! } : { ok: false, reason: "conflict" };
    if (!(await lockOwnedWorkout(trx, userId, workoutId)) || !(await validExercise(trx, values))) return { ok: false, reason: "not_found" };
    const common = { id, workout_session_id: workoutId, create_fingerprint: fingerprint, duration_seconds: values.durationSeconds, note: values.note };
    const row = "exerciseId" in values
      ? await trx.insertInto("timed_sets").values({ ...common, exercise_id: values.exerciseId, set_type: values.setType, added_weight_kg: values.addedWeightKg })
        .onConflict((conflict) => conflict.column("id").doNothing()).returning("id").executeTakeFirst()
      : await trx.insertInto("cardio_entries").values({ ...common, activity: values.activity, distance_metres: values.distanceMetres, average_heart_rate: values.averageHeartRate })
        .onConflict((conflict) => conflict.column("id").doNothing()).returning("id").executeTakeFirst();
    if (row) return { ok: true, replayed: false, value: (await findEntry(trx, kind, userId, id))! };
    const raced = await trx.selectFrom(kind).innerJoin("workout_sessions", "workout_sessions.id", `${kind}.workout_session_id`)
      .select(`${kind}.create_fingerprint as fingerprint`).where(`${kind}.id`, "=", id)
      .where("workout_sessions.user_id", "=", userId).executeTakeFirst();
    return raced?.fingerprint === fingerprint
      ? { ok: true, replayed: true, value: (await findEntry(trx, kind, userId, id))! } : { ok: false, reason: "conflict" };
  });
}
async function changeEntry(db: Kysely<AppDatabase>, kind: TrackingKind, userId: string, workoutId: string,
  id: string, revision: number, values: TimedValues | CardioValues | null): Promise<Result<NonNullable<Awaited<ReturnType<typeof findEntry>>>>> {
  return db.transaction().execute(async (trx) => {
    if (!(await lockOwnedWorkout(trx, userId, workoutId))) return { ok: false, reason: "not_found" };
    const entry = await findEntry(trx, kind, userId, id);
    if (!entry || entry.workoutId !== workoutId) return { ok: false, reason: "not_found" };
    if (entry.revision !== revision || entry.deletedAt) return { ok: false, reason: "conflict" };
    if (values && !(await validExercise(trx, values))) return { ok: false, reason: "not_found" };
    await trx.updateTable(kind).set({ ...(values ? fields(values) : { deleted_at: new Date() }),
      revision: sql`revision + 1`, updated_at: new Date() }).where("id", "=", id).execute();
    return { ok: true, value: (await findEntry(trx, kind, userId, id))! };
  });
}
export type TrackingRepository = ReturnType<typeof createTrackingRepository>;
