import type { ExerciseNameEvaluation } from "./exercise-name-quality.js";

export type ExerciseResult<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      reason:
        | "name_conflict"
        | "muscle_group_not_found"
        | "exercise_forbidden"
        | "exercise_not_found"
        | "merge_same_exercise";
    }
  | {
      ok: false;
      reason: "name_review_required" | "name_blocked";
      evaluation: ExerciseNameEvaluation;
    };

export interface ExerciseMergeSummary {
  source: { id: string; name: string; retired: boolean };
  target: { id: string; name: string };
  reassignedSessionExercises: number;
  reassignedTemplateExercises: number;
  affectedWorkouts: number;
  affectedTemplates: number;
  affectedSets: number;
}
