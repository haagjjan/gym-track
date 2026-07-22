import type { WorkoutSessionRecord } from "./workout.repository.js";

export const workoutSessionSelection = [
  "id",
  "user_id as userId",
  "started_at as startedAt",
  "ended_at as endedAt",
  "workout_type as workoutType",
  "title",
  "notes",
  "source_template_id as sourceTemplateId"
] as const;

export function toWorkoutSessionRecord(row: {
  id: string;
  userId: string;
  startedAt: Date;
  endedAt: Date | null;
  workoutType: string | null;
  title: string | null;
  notes: string | null;
  sourceTemplateId: string | null;
}): WorkoutSessionRecord {
  return {
    id: row.id,
    userId: row.userId,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    workoutType: row.workoutType,
    title: row.title,
    notes: row.notes,
    sourceTemplateId: row.sourceTemplateId
  };
}
