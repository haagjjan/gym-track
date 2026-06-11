import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createWorkoutCsvService } from "./workout-csv.service.js";
import type { WorkoutCsvExportRow, WorkoutCsvRepository } from "./workout-csv.repository.js";
import type { WorkoutCsvWorkout } from "./workout-csv.js";

class FakeWorkoutCsvRepository implements WorkoutCsvRepository {
  public importedWorkouts: WorkoutCsvWorkout[] | null = null;

  public async exportRows(): Promise<WorkoutCsvExportRow[]> {
    return [];
  }

  public async importWorkouts(_userId: string, workouts: WorkoutCsvWorkout[]): Promise<void> {
    this.importedWorkouts = workouts;
  }

  public async listMuscleGroupSlugs(): Promise<string[]> {
    return ["chest"];
  }
}

describe("workout csv service", () => {
  it("previews warned exercise names with suggestions", async () => {
    const service = createWorkoutCsvService({
      repository: new FakeWorkoutCsvRepository()
    });
    const result = await service.previewImport("user-1", csvWithExercise("Incline Dumbell Press"));

    assert.equal(result.ok, true);

    if (!result.ok) {
      return;
    }

    assert.equal(result.value.importability, "ready_with_warnings");
    assert.equal(result.value.warnings[0]?.suggestions[0], "Incline Dumbbell Press");
  });

  it("blocks suspicious exercise names during preview", async () => {
    const service = createWorkoutCsvService({
      repository: new FakeWorkoutCsvRepository()
    });
    const result = await service.previewImport("user-1", csvWithExercise("Bench Press 2026-05-20"));

    assert.equal(result.ok, true);

    if (!result.ok) {
      return;
    }

    assert.equal(result.value.importability, "blocked");
    assert.equal(result.value.blocked[0]?.row, 2);
  });

  it("requires confirmation before importing warned names", async () => {
    const repository = new FakeWorkoutCsvRepository();
    const service = createWorkoutCsvService({ repository });
    const result = await service.importCsv("user-1", csvWithExercise("Incline Dumbell Press"));

    assert.equal(result.ok, false);
    assert.equal(result.preview?.warnings.length, 1);
    assert.equal(repository.importedWorkouts, null);
  });

  it("imports warned names after confirmation", async () => {
    const repository = new FakeWorkoutCsvRepository();
    const service = createWorkoutCsvService({ repository });
    const result = await service.importCsv("user-1", csvWithExercise("Incline Dumbell Press"), true);

    assert.equal(result.ok, true);
    assert.equal(repository.importedWorkouts?.length, 1);
  });
});

function csvWithExercise(exerciseName: string): string {
  return [
    "workout_started_at,workout_ended_at,workout_type,workout_title,workout_notes,exercise_name,primary_muscle_group_slug,equipment,exercise_type,exercise_position,set_order,set_type,weight_kg,reps,rir,rest_time_seconds,set_note",
    `2026-05-20T08:00:00.000Z,2026-05-20T09:00:00.000Z,upper,CSV Upper,,${exerciseName},chest,barbell,compound,1,1,working,75.00,8,2,90,Imported set`
  ].join("\n");
}
