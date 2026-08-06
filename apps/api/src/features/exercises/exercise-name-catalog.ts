import manifest from "./system-exercise-catalog.json" with { type: "json" };

export interface SystemExerciseCatalogRecord {
  id: string;
  name: string;
  equipment: string;
  exerciseType: "compound" | "isolation" | "isometric" | "other";
  primaryMuscleGroupSlugs: string[];
  secondaryMuscleGroupSlugs: string[];
  origins: string[];
  sourceIds: string[];
}

export const systemExerciseCatalog = manifest.records as SystemExerciseCatalogRecord[];
export const canonicalExerciseNames = systemExerciseCatalog.map((record) => record.name);
export const priorityExerciseNames = [
  "Barbell Bench Press",
  "Barbell Curl",
  "Barbell Overhead Press",
  "Barbell Row",
  "Barbell Squat",
  "Bulgarian Split Squat",
  "Cable Chest Fly",
  "Cable Curl",
  "Cable Face Pull",
  "Cable Lateral Raise",
  "Cable Pushdown",
  "Cable Row",
  "Chest Press Machine",
  "Dumbbell Bench Press",
  "Dumbbell Curl",
  "Dumbbell Fly",
  "Dumbbell Hammer Curl",
  "Dumbbell Incline Bench Press",
  "Dumbbell Lateral Raise",
  "Dumbbell Overhead Press",
  "Dumbbell Romanian Deadlift",
  "Dumbbell Row",
  "Dumbbell Shoulder Press",
  "EZ-Bar Curl",
  "Flat Bench Press",
  "Goblet Squat",
  "Hammer Curl",
  "Hip Thrust",
  "Incline Bench Press",
  "Incline Dumbbell Press",
  "Lat Pulldown",
  "Leg Curl",
  "Leg Extension",
  "Leg Press",
  "Machine Chest Press",
  "Machine Row",
  "Pec Deck",
  "Preacher Curl",
  "Pull-Up",
  "Push-Up",
  "Rear Delt Fly",
  "Romanian Deadlift",
  "Seated Cable Row",
  "Seated Dumbbell Curl",
  "Seated Dumbbell Press",
  "Shoulder Press Machine",
  "Smith Machine Bench Press",
  "Smith Machine Squat",
  "Split Squat",
  "Standing Calf Raise",
  "Sumo Deadlift",
  "T-Bar Row",
  "Trap Bar Deadlift",
  "Triceps Dip",
  "Walking Lunge",
  "Weighted Dip",
  "Weighted Pull-Up",
  "Wide-Grip Lat Pulldown"
] as const;
export const systemExerciseCatalogSource = manifest.source;
