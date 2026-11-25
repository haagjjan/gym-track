import { sql, type Kysely } from "kysely";
import type { AppDatabase } from "../../db/database.js";

export interface PreviousPerformanceSetRecord {
  setId: string;
  setOrder: number;
  weightKg: string;
  reps: number;
  rir: number;
  setType: "working" | "warmup";
}

export interface PreviousPerformanceRecord {
  workoutId: string;
  workoutTitle: string | null;
  workoutStartedAt: Date;
  bestSet: PreviousPerformanceSetRecord & { setType: "working" };
  sets: PreviousPerformanceSetRecord[];
}

interface PreviousPerformanceRow {
  exerciseId: string;
  workoutId: string;
  workoutTitle: string | null;
  workoutStartedAt: Date;
  setId: string;
  setOrder: number;
  setType: "working" | "warmup";
  weightKg: string;
  reps: number;
  rir: number;
  bestRank: string | number;
}

export async function findPreviousPerformances(
  db: Kysely<AppDatabase>,
  input: {
    userId: string;
    currentWorkoutId: string;
    currentWorkoutStartedAt: Date;
    exerciseIds: string[];
  }
): Promise<Map<string, PreviousPerformanceRecord>> {
  const exerciseIds = [...new Set(input.exerciseIds)];
  if (exerciseIds.length === 0) return new Map();

  const ids = sql.join(exerciseIds.map((id) => sql`${id}::uuid`));
  const result = await sql<PreviousPerformanceRow>`
    with matching_workouts as (
      select distinct
        session_exercises.exercise_id,
        workout_sessions.id as workout_id,
        workout_sessions.title as workout_title,
        workout_sessions.started_at as workout_started_at
      from workout_sessions
      join session_exercises
        on session_exercises.workout_session_id = workout_sessions.id
       and session_exercises.deleted_at is null
      join sets matching_sets
        on matching_sets.session_exercise_id = session_exercises.id
       and matching_sets.deleted_at is null
       and matching_sets.set_type = 'working'
      where workout_sessions.user_id = ${input.userId}
        and workout_sessions.id <> ${input.currentWorkoutId}
        and workout_sessions.ended_at is not null
        and workout_sessions.deleted_at is null
        and workout_sessions.started_at < ${input.currentWorkoutStartedAt}
        and session_exercises.exercise_id in (${ids})
    ), ranked_workouts as (
      select *, row_number() over (
        partition by exercise_id
        order by workout_started_at desc, workout_id asc
      ) as workout_rank
      from matching_workouts
    ), ranked_sets as (
      select
        ranked_workouts.exercise_id as "exerciseId",
        ranked_workouts.workout_id as "workoutId",
        ranked_workouts.workout_title as "workoutTitle",
        ranked_workouts.workout_started_at as "workoutStartedAt",
        session_exercises.position as "exercisePosition",
        sets.id as "setId",
        sets.set_order as "setOrder",
        sets.set_type as "setType",
        sets.weight_kg as "weightKg",
        sets.reps,
        sets.rir,
        row_number() over (
          partition by ranked_workouts.exercise_id
          order by
            case when sets.set_type = 'working' then 0 else 1 end asc,
            sets.weight_kg desc,
            sets.reps desc,
            sets.set_order asc,
            sets.id asc
        ) as "bestRank"
      from ranked_workouts
      join session_exercises
        on session_exercises.workout_session_id = ranked_workouts.workout_id
       and session_exercises.exercise_id = ranked_workouts.exercise_id
       and session_exercises.deleted_at is null
      join sets
        on sets.session_exercise_id = session_exercises.id
       and sets.deleted_at is null
      where ranked_workouts.workout_rank = 1
    )
    select
      "exerciseId",
      "workoutId",
      "workoutTitle",
      "workoutStartedAt",
      "setId",
      "setOrder",
      "setType",
      "weightKg",
      reps,
      rir,
      "bestRank"
    from ranked_sets
    order by "exerciseId" asc, "exercisePosition" asc, "setOrder" asc, "setId" asc
  `.execute(db);

  const byExercise = new Map<string, PreviousPerformanceRecord>();
  for (const row of result.rows) {
    const set: PreviousPerformanceSetRecord = {
      setId: row.setId,
      setOrder: row.setOrder,
      weightKg: row.weightKg,
      reps: row.reps,
      rir: row.rir,
      setType: row.setType
    };
    const existing = byExercise.get(row.exerciseId);
    if (!existing) {
      byExercise.set(row.exerciseId, {
        workoutId: row.workoutId,
        workoutTitle: row.workoutTitle,
        workoutStartedAt: row.workoutStartedAt,
        bestSet: { ...set, setType: "working" },
        sets: [set]
      });
    } else {
      existing.sets.push(set);
    }
    if (Number(row.bestRank) === 1) {
      const target = byExercise.get(row.exerciseId);
      if (target) {
        target.bestSet = { ...set, setType: "working" };
      }
    }
  }
  return byExercise;
}
