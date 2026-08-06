import { exerciseNameLookup } from "./exercise-name-normalization.js";

export const exerciseNameAliases: Readonly<Record<string, readonly string[]>> = {
  "bench press": ["Barbell Bench Press", "Flat Bench Press"],
  bench: ["Barbell Bench Press", "Flat Bench Press"],
  ohp: ["Barbell Overhead Press", "Military Press"],
  rdl: ["Romanian Deadlift", "Barbell Romanian Deadlift"],
  "romanian dl": ["Romanian Deadlift"],
  "stiff leg dl": ["Stiff-Leg Deadlift"],
  "lat raise": ["Dumbbell Lateral Raise", "Cable Lateral Raise"],
  "lateral raises": ["Dumbbell Lateral Raise", "Cable Lateral Raise"],
  "skull crusher": ["Barbell Skull Crusher", "EZ-Bar Skull Crusher"],
  skullcrusher: ["Barbell Skull Crusher", "EZ-Bar Skull Crusher"],
  "tri pushdown": ["Triceps Pushdown", "Cable Pushdown"],
  pulldowns: ["Lat Pulldown"],
  pullups: ["Pull-Up"],
  chinups: ["Chin-Up"],
  "leg curls": ["Leg Curl", "Seated Leg Curl", "Lying Leg Curl"],
  "leg extensions": ["Leg Extension", "Seated Leg Extension"],
  "db bench": ["Dumbbell Bench Press"],
  "db row": ["Dumbbell Row", "Single-Arm Dumbbell Row"],
  "bb row": ["Barbell Row"],
  "bb squat": ["Barbell Squat"],
  "kb swing": ["Kettlebell Swing"]
};

const normalizedAliases = new Map(
  Object.entries(exerciseNameAliases).map(([alias, targets]) => [exerciseNameLookup(alias), targets])
);

export function resolveExerciseNameAlias(name: string): readonly string[] {
  return normalizedAliases.get(exerciseNameLookup(name)) ?? [];
}
