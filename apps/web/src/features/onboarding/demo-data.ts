import type { Exercise, MuscleGroup, WorkoutDetail, WorkoutSet, WorkoutSummary, WorkoutTemplate } from "../../shared/api/types";

// Curated records from the reviewed system catalog. Copies resolve the current catalog again.
const catalog = [
  { id: "10000000-a824-4060-81cd-60fd9da7d9a2", name: "Barbell Bench Press", equipment: "barbell", primary: "chest", secondary: ["triceps"] },
  { id: "10000000-6274-4c7b-8295-cb475f4a1204", name: "Goblet Squat", equipment: "kettlebell", primary: "quads", secondary: ["calves", "glutes", "hamstrings", "shoulders"] },
  { id: "10000000-1b17-4595-8dc0-150c5aea5b9a", name: "Seated Cable Row", equipment: "cable", primary: "back", secondary: ["biceps"] }
];
const names: Record<string, string> = { chest: "Chest", quads: "Quads", back: "Back", triceps: "Triceps", calves: "Calves", glutes: "Glutes", hamstrings: "Hamstrings", shoulders: "Shoulders", biceps: "Biceps" };
const muscle = (slug: string): MuscleGroup => ({ id: `example-${slug}`, slug, name: names[slug] ?? slug });
const catalogDate = "2026-08-04T00:00:00.000Z";
export const demoExercises: Exercise[] = catalog.map((record) => ({
  id: record.id, name: record.name, equipment: record.equipment, exerciseType: "compound",
  primaryMuscleGroup: muscle(record.primary), primaryMuscleGroups: [muscle(record.primary)],
  secondaryMuscleGroups: record.secondary.map(muscle),
  muscleGroups: [{ ...muscle(record.primary), role: "PRIMARY" }, ...record.secondary.map((slug) => ({ ...muscle(slug), role: "SECONDARY" as const }))],
  createdByUserId: null, createdAt: catalogDate, updatedAt: catalogDate
}));
export const demoTemplate: WorkoutTemplate = {
  id: "example-template", name: "Example full-body", createdAt: catalogDate, updatedAt: catalogDate, lastUsedAt: null,
  exercises: demoExercises.map((exercise, index) => ({ id: `example-template-${index}`, position: index + 1, exercise }))
};

export function practiceWorkout(now: number, withTemplate = true): WorkoutDetail {
  return { id: "example-practice", title: "Example full-body · practice", workoutType: null,
    startedAt: new Date(now).toISOString(), endedAt: null, isOpen: true, sourceTemplateId: withTemplate ? demoTemplate.id : null,
    exercises: (withTemplate ? demoExercises : []).map((exercise, index) => ({ id: `practice-exercise-${index}`, position: index + 1, exercise, sets: [], previousPerformance: null })) };
}

export function sampleWorkouts(now: number): WorkoutDetail[] {
  return [25, 22, 18, 15, 11, 8, 4, 1].map((days, index) => {
    const startedAt = new Date(now - days * 86_400_000).toISOString();
    return { ...practiceWorkout(now), id: `example-history-${index}`, title: `Example full-body ${index + 1}`, startedAt,
      endedAt: new Date(new Date(startedAt).getTime() + 35 * 60_000).toISOString(), isOpen: false,
      exercises: demoExercises.map((exercise, position) => ({ id: `example-${index}-${position}`, position: position + 1, exercise, previousPerformance: null,
        sets: Array.from({ length: 3 + ((index + position) % 3) }, (_, setIndex) => exampleSet(index, position, setIndex, startedAt)) })) };
  }).reverse();
}

function exampleSet(workout: number, exercise: number, index: number, date: string): WorkoutSet {
  return { id: `example-set-${workout}-${exercise}-${index}`, setOrder: index + 1, setType: index === 0 ? "warmup" : "working",
    weightKg: String((index === 0 ? 10 : [20, 16, 25][exercise]!) + Math.floor(workout / 2) * 2.5),
    reps: index === 0 ? 10 : 8 + (workout % 2), rir: 2, note: null, restTimeSeconds: index === 0 ? null : 90,
    createdAt: date, updatedAt: date };
}

export function workoutSummary(workout: WorkoutDetail): WorkoutSummary {
  const sets = workout.exercises.flatMap((exercise) => exercise.sets);
  const { exercises, ...rest } = workout;
  return { ...rest, totalExercises: exercises.length, totalSets: sets.length,
    tonnageKg: sets.reduce((total, set) => total + Number(set.weightKg) * set.reps, 0).toFixed(2),
    exercisePreview: exercises.map((entry) => entry.exercise) };
}
