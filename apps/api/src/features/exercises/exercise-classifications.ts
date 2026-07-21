export const EXERCISE_EQUIPMENT = [
  "barbell",
  "dumbbell",
  "kettlebell",
  "cable",
  "machine",
  "plate-loaded machine",
  "Smith machine",
  "resistance band",
  "bodyweight",
  "other"
] as const;

export const EXERCISE_TYPES = [
  "compound",
  "isolation",
  "isometric",
  "other"
] as const;

export type ExerciseEquipment = (typeof EXERCISE_EQUIPMENT)[number];
export type ExerciseType = (typeof EXERCISE_TYPES)[number];
