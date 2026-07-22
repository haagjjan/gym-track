import type {
  WorkoutDetailRecord,
  WorkoutListRecord
} from "./workout.repository.js";

interface MuscleGroupShape {
  id: string;
  slug: string;
  name: string;
}

interface WorkoutSetShape {
  id: string;
  setOrder: number;
  setType: string;
  weightKg: string;
  reps: number;
  rir: number;
  restTimeSeconds: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SessionExerciseShape {
  id: string;
  position: number;
  exercise: {
    id: string;
    name: string;
    primaryMuscleGroup: MuscleGroupShape;
    primaryMuscleGroups: MuscleGroupShape[];
    secondaryMuscleGroups: MuscleGroupShape[];
    muscleGroups: Array<MuscleGroupShape & { role: "PRIMARY" | "SECONDARY" }>;
  };
  sets: WorkoutSetShape[];
}

export interface WorkoutDetail {
  id: string;
  startedAt: string;
  endedAt: string | null;
  isOpen: boolean;
  workoutType: string | null;
  title: string | null;
  notes: string | null;
  sourceTemplateId: string | null;
  exercises: SessionExerciseShape[];
}

export interface WorkoutList {
  items: WorkoutSummary[];
  allTimeSummary: {
    totalSessions: number;
    completedSessions: number;
    cumulativeTonnageKg: string;
    averageCompletedDurationSeconds: number | null;
    completionRate: number;
  };
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

interface WorkoutSummary {
  id: string;
  startedAt: string;
  endedAt: string | null;
  isOpen: boolean;
  workoutType: string | null;
  title: string | null;
  notes: string | null;
  totalExercises: number;
  totalSets: number;
  tonnageKg: string;
  exercisePreview: Array<{
    id: string;
    name: string;
    equipment: string | null;
    exerciseType: string | null;
  }>;
  sourceTemplateId: string | null;
}

export function toWorkoutSummary(record: WorkoutListRecord): WorkoutSummary {
  return {
    id: record.id,
    startedAt: record.startedAt.toISOString(),
    endedAt: record.endedAt?.toISOString() ?? null,
    isOpen: record.endedAt === null,
    workoutType: record.workoutType,
    title: record.title,
    notes: record.notes,
    totalExercises: record.totalExercises,
    totalSets: record.totalSets,
    tonnageKg: record.tonnageKg,
    exercisePreview: record.exercisePreview,
    sourceTemplateId: record.sourceTemplateId ?? null
  };
}

export function toWorkoutDetail(record: WorkoutDetailRecord): WorkoutDetail {
  return {
    id: record.id,
    startedAt: record.startedAt.toISOString(),
    endedAt: record.endedAt?.toISOString() ?? null,
    isOpen: record.endedAt === null,
    workoutType: record.workoutType,
    title: record.title,
    notes: record.notes,
    sourceTemplateId: record.sourceTemplateId ?? null,
    exercises: record.exercises.map((item) => ({
      id: item.id,
      position: item.position,
      exercise: item.exercise,
      sets: item.sets.map(toWorkoutSet)
    }))
  };
}

function toWorkoutSet(record: WorkoutDetailRecord["exercises"][number]["sets"][number]) {
  return {
    id: record.id,
    setOrder: record.setOrder,
    setType: record.setType,
    weightKg: record.weightKg,
    reps: record.reps,
    rir: record.rir,
    restTimeSeconds: record.restTimeSeconds,
    note: record.note,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}
