import type { ExerciseRecord } from "./exercise.repository.js";

export interface MuscleGroupShape {
  id: string;
  slug: string;
  name: string;
}

interface ExerciseMuscleGroupShape extends MuscleGroupShape {
  role: "PRIMARY" | "SECONDARY";
}

export interface ExerciseShape {
  id: string;
  name: string;
  equipment: string | null;
  exerciseType: string | null;
  primaryMuscleGroup: MuscleGroupShape;
  primaryMuscleGroups: MuscleGroupShape[];
  secondaryMuscleGroups: MuscleGroupShape[];
  muscleGroups: ExerciseMuscleGroupShape[];
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MuscleGroupList {
  items: MuscleGroupShape[];
}

export interface ExerciseList {
  items: ExerciseShape[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

export function toExerciseShape(record: ExerciseRecord): ExerciseShape {
  return {
    id: record.id,
    name: record.name,
    equipment: record.equipment,
    exerciseType: record.exerciseType,
    primaryMuscleGroup: toMuscleGroupShape(record.primaryMuscleGroup),
    primaryMuscleGroups: record.primaryMuscleGroups.map(toMuscleGroupShape),
    secondaryMuscleGroups: record.secondaryMuscleGroups.map(toMuscleGroupShape),
    muscleGroups: [
      ...record.primaryMuscleGroups.map((muscle) => ({
        ...toMuscleGroupShape(muscle),
        role: "PRIMARY" as const
      })),
      ...record.secondaryMuscleGroups.map((muscle) => ({
        ...toMuscleGroupShape(muscle),
        role: "SECONDARY" as const
      }))
    ],
    createdByUserId: record.createdByUserId,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

export function toMuscleGroupShape(record: MuscleGroupShape): MuscleGroupShape {
  return {
    id: record.id,
    slug: record.slug,
    name: record.name
  };
}
