export type SetType = "warmup" | "working";

export interface MuscleGroup {
  id: string;
  slug: string;
  name: string;
}

export interface Exercise {
  id: string;
  name: string;
  equipment: string | null;
  exerciseType: string | null;
  primaryMuscleGroup: MuscleGroup;
  secondaryMuscleGroups: MuscleGroup[];
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutSet {
  id: string;
  setOrder: number;
  setType: SetType;
  weightKg: string;
  reps: number;
  rir: number;
  restTimeSeconds: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionExercise {
  id: string;
  position: number;
  exercise: {
    id: string;
    name: string;
    primaryMuscleGroup: MuscleGroup;
  };
  sets: WorkoutSet[];
}

export interface WorkoutSummary {
  id: string;
  startedAt: string;
  endedAt: string | null;
  isOpen: boolean;
  workoutType: string | null;
  title: string | null;
  notes: string | null;
  totalExercises: number;
  totalSets: number;
}

export interface WorkoutDetail {
  id: string;
  startedAt: string;
  endedAt: string | null;
  isOpen: boolean;
  workoutType: string | null;
  title: string | null;
  notes: string | null;
  exercises: SessionExercise[];
}

export interface ListWorkoutsPayload {
  items: WorkoutSummary[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

export interface ListExercisesPayload {
  items: Exercise[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

export interface ListMuscleGroupsPayload {
  items: MuscleGroup[];
}

export interface ApiErrorPayload {
  error: {
    code?: string | undefined;
    message?: string | undefined;
    fields?: Record<string, string[]> | undefined;
  };
}
