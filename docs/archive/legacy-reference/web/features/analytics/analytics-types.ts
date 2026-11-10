export interface ApiErrorPayload {
  error: {
    code?: string | undefined;
    message?: string | undefined;
    fields?: Record<string, string[]> | undefined;
  };
}

export interface MuscleGroup {
  id: string;
  slug: string;
  name: string;
}

interface Exercise {
  id: string;
  name: string;
  primaryMuscleGroup: MuscleGroup;
  secondaryMuscleGroups: MuscleGroup[];
}

export interface CompletedExercise extends Exercise {
  lastDoneAt: string;
  totalSets: number;
}

export interface ListCompletedExercisesPayload {
  items: CompletedExercise[];
}

export interface ExerciseProgressItem {
  workoutId: string;
  sessionExerciseId: string;
  setId: string;
  sessionDate: string;
  setOrder: number;
  setType: "warmup" | "working";
  weightKg: string;
  reps: number;
  rir: number;
  estimatedOneRepMaxKg: string;
}

export interface ExerciseProgressPayload {
  exerciseId: string;
  items: ExerciseProgressItem[];
}

export interface ExerciseSummaryPayload {
  exerciseId: string;
  totalSets: number;
  totalReps: number;
  totalVolumeKg: string;
  averageRir: number | null;
  bestTopSet: {
    workoutId: string;
    setId: string;
    sessionDate: string;
    weightKg: string;
    reps: number;
    rir: number;
    estimatedOneRepMaxKg: string;
  } | null;
}

export interface WeeklyVolumePayload {
  weeks: {
    weekStart: string;
    weekEnd: string;
    items: {
      muscleGroup: MuscleGroup;
      workingSets: number;
      exercises: {
        id: string;
        name: string;
        workingSets: number;
      }[];
      recentSessions: {
        workoutId: string;
        sessionDate: string;
        workingSets: number;
      }[];
    }[];
  }[];
}
