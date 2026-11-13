import type { Kysely } from "kysely";
import type { AppDatabase } from "../../db/database.js";

export async function trackingSummaries(db: Kysely<AppDatabase>, workoutIds: string[]) {
  const summaries = new Map<string, { timedSets: number; timeExercises: number; cardioEntries: number }>();
  if (!workoutIds.length) return summaries;
  const [timed, cardio] = await Promise.all([
    db.selectFrom("timed_sets").select("workout_session_id as workoutId").select((eb) => [eb.fn.countAll<string>().as("sets"), eb.fn.count<string>("exercise_id").distinct().as("exercises")])
      .where("workout_session_id", "in", workoutIds).where("deleted_at", "is", null).groupBy("workout_session_id").execute(),
    db.selectFrom("cardio_entries").select("workout_session_id as workoutId").select((eb) => eb.fn.countAll<string>().as("entries"))
      .where("workout_session_id", "in", workoutIds).where("deleted_at", "is", null).groupBy("workout_session_id").execute()
  ]);
  for (const workoutId of workoutIds) {
    const sets = timed.find((entry) => entry.workoutId === workoutId);
    summaries.set(workoutId, { timedSets: Number(sets?.sets ?? 0), timeExercises: Number(sets?.exercises ?? 0),
      cardioEntries: Number(cardio.find((entry) => entry.workoutId === workoutId)?.entries ?? 0) });
  }
  return summaries;
}
