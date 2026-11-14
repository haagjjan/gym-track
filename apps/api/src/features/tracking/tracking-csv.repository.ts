import { createHash, randomUUID } from "node:crypto";
import { type Kysely } from "kysely";
import type { AppDatabase } from "../../db/database.js";
import { ensureSessionExercise } from "./tracking.repository.js";
import { parseTrackingCsv, unparseTrackingCsv, type TrackingCsvRow } from "./tracking-csv.js";

export function createTrackingCsvRepository(db: Kysely<AppDatabase>) {
  return {
    async exportCsv(userId: string): Promise<string> {
      const [timed, cardio] = await Promise.all([
        db.selectFrom("timed_sets as entry").innerJoin("workout_sessions as ws", "ws.id", "entry.workout_session_id")
          .innerJoin("exercises as ex", "ex.id", "entry.exercise_id")
          .select(["ws.id as key", "ws.started_at as start", "ws.ended_at as end", "ws.title", "ws.workout_type as workoutType", "ws.notes as workoutNotes", "ex.name", "entry.set_type as setType", "entry.duration_seconds as duration", "entry.added_weight_kg as weight", "entry.note", "entry.created_at as recordedAt"])
          .where("ws.user_id", "=", userId).where("ws.deleted_at", "is", null).where("entry.deleted_at", "is", null).where("ws.ended_at", "is not", null).orderBy("ws.started_at").orderBy("entry.created_at").orderBy("entry.id").execute(),
        db.selectFrom("cardio_entries as entry").innerJoin("workout_sessions as ws", "ws.id", "entry.workout_session_id")
          .select(["ws.id as key", "ws.started_at as start", "ws.ended_at as end", "ws.title", "ws.workout_type as workoutType", "ws.notes as workoutNotes", "entry.activity", "entry.duration_seconds as duration", "entry.distance_metres as distance", "entry.average_heart_rate as heartRate", "entry.calories", "entry.note", "entry.created_at as recordedAt"])
          .where("ws.user_id", "=", userId).where("ws.deleted_at", "is", null).where("entry.deleted_at", "is", null).where("ws.ended_at", "is not", null).orderBy("ws.started_at").orderBy("entry.created_at").orderBy("entry.id").execute()
      ]);
      const rows: TrackingCsvRow[] = [
        ...timed.map((row) => ({ format_version: "gymtrack-tracking-v1", workout_key: row.key, workout_started_at: row.start.toISOString(), workout_ended_at: row.end!.toISOString(), workout_title: row.title ?? "", workout_type: row.workoutType ?? "", workout_notes: row.workoutNotes ?? "", entry_kind: "time", entry_recorded_at: row.recordedAt.toISOString(), exercise_name: row.name,
          activity: "", set_type: row.setType, duration_seconds: String(row.duration), added_weight_kg: row.weight ?? "", distance_metres: "", average_heart_rate: "", calories: "", note: row.note ?? "" })),
        ...cardio.map((row) => ({ format_version: "gymtrack-tracking-v1", workout_key: row.key, workout_started_at: row.start.toISOString(), workout_ended_at: row.end!.toISOString(), workout_title: row.title ?? "", workout_type: row.workoutType ?? "", workout_notes: row.workoutNotes ?? "", entry_kind: "cardio", entry_recorded_at: row.recordedAt.toISOString(), exercise_name: "",
          activity: row.activity, set_type: "", duration_seconds: String(row.duration), added_weight_kg: "", distance_metres: row.distance ?? "", average_heart_rate: row.heartRate?.toString() ?? "", calories: row.calories?.toString() ?? "", note: row.note ?? "" }))
      ];
      return unparseTrackingCsv(rows);
    },
    async importCsv(userId: string, text: string) {
      const parsed = parseTrackingCsv(text);
      if (!parsed.ok) return parsed;
      return db.transaction().execute(async (trx) => {
        const catalog = await trx.selectFrom("exercises").select(["id", "name", "tracking_mode as mode"]).where("tracking_mode", "<>", "reps").where("deleted_at", "is", null).forShare().execute();
        const byName = new Map(catalog.map((exercise) => [`${exercise.mode}:${exercise.name.toLowerCase()}`, exercise]));
        const find = (row: { kind: "time" | "cardio"; exerciseName: string }) => byName.get(`${row.kind}:${row.exerciseName.toLowerCase()}`);
        const missing = parsed.rows.filter((row) => !find(row));
        if (missing.length) return { ok: false as const, errors: missing.map((row) => ({ row: row.row, message: `Create the ${row.kind} exercise "${row.exerciseName}" before importing.` })) };
        const workouts = new Map<string, string>();
        for (const row of parsed.rows) {
          let workoutId = workouts.get(row.key);
          if (!workoutId) {
            workoutId = randomUUID(); workouts.set(row.key, workoutId);
            await trx.insertInto("workout_sessions").values({ id: workoutId, user_id: userId, started_at: row.startedAt, ended_at: row.endedAt, workout_type: row.workoutType, title: row.title, notes: row.workoutNotes }).execute();
          }
          const exercise = find(row)!;
          await ensureSessionExercise(trx, workoutId, exercise.id, row.recordedAt);
          const common = { id: randomUUID(), workout_session_id: workoutId, created_at: row.recordedAt };
          if ("setType" in row.values) {
            const fields = { duration_seconds: row.values.durationSeconds, note: row.values.note, exercise_id: exercise.id, set_type: row.values.setType, added_weight_kg: row.values.addedWeightKg };
            await trx.insertInto("timed_sets").values({ ...common, ...fields, create_fingerprint: fingerprint("timed_sets", workoutId, fields) }).execute();
          } else {
            const fields = { duration_seconds: row.values.durationSeconds, note: row.values.note, exercise_id: exercise.id, distance_metres: row.values.distanceMetres, average_heart_rate: row.values.averageHeartRate, calories: row.values.calories };
            await trx.insertInto("cardio_entries").values({ ...common, ...fields, activity: exercise.name, create_fingerprint: fingerprint("cardio_entries", workoutId, fields) }).execute();
          }
        }
        return { ok: true as const, importedRows: parsed.rows.length, importedWorkouts: workouts.size };
      });
    }
  };
}
function fingerprint(kind: string, workoutId: string, fields: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify({ kind, workoutId, ...fields })).digest("hex");
}
