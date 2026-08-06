export interface MuscleGroup {
  id: string;
  slug: string;
  name: string;
}

export interface ExerciseMuscleGroup extends MuscleGroup {
  role: "PRIMARY" | "SECONDARY";
}

export interface Exercise {
  id: string;
  name: string;
  equipment: string | null;
  exerciseType: string | null;
  primaryMuscleGroup: MuscleGroup;
  primaryMuscleGroups: MuscleGroup[];
  secondaryMuscleGroups: MuscleGroup[];
  muscleGroups: ExerciseMuscleGroup[];
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SetType = "working" | "warmup";

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
  exercise: Exercise;
  sets: WorkoutSet[];
  previousPerformance: {
    workoutId: string;
    workoutTitle: string | null;
    workoutStartedAt: string;
    bestSet: {
      setId: string;
      setOrder: number;
      weightKg: string;
      reps: number;
      rir: number;
      setType: "working";
    };
  } | null;
}

export interface WorkoutSummary {
  id: string;
  title: string | null;
  workoutType: string | null;
  startedAt: string;
  endedAt: string | null;
  isOpen: boolean;
  totalExercises: number;
  totalSets: number;
  tonnageKg: string;
  exercisePreview: Array<Pick<Exercise, "id" | "name" | "equipment" | "exerciseType">>;
  sourceTemplateId: string | null;
}

export interface WorkoutDetail extends Omit<WorkoutSummary, "totalExercises" | "totalSets" | "tonnageKg" | "exercisePreview"> {
  exercises: SessionExercise[];
}

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
}

export interface ListWorkoutsPayload {
  items: WorkoutSummary[];
  pagination: Pagination;
  allTimeSummary: {
    totalSessions: number;
    completedSessions: number;
    cumulativeTonnageKg: string;
    averageCompletedDurationSeconds: number | null;
    completionRate: number;
  };
}

export interface CompletedExercise extends Exercise {
  lastDoneAt: string;
  plottedSetCount: number;
  totalSets: number;
}

export interface ExerciseProgressItem {
  workoutId: string;
  sessionExerciseId: string;
  setId: string;
  sessionDate: string;
  setOrder: number;
  setType: SetType;
  weightKg: string;
  reps: number;
  rir: number;
  estimatedOneRepMaxKg: string;
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

export interface WeeklyVolumeWeekItem {
  muscleGroup: MuscleGroup;
  workingSets: number;
  exercises: { id: string; name: string; workingSets: number }[];
  recentSessions: { workoutId: string; sessionDate: string; workingSets: number }[];
}

export interface WeeklyVolumePayload {
  weeks: {
    weekStart: string;
    weekEnd: string;
    items: WeeklyVolumeWeekItem[];
  }[];
}

export interface SetInput {
  setType: SetType;
  weightKg: string;
  reps: number;
  rir: number;
  restTimeSeconds: number | null;
  note: string | null;
}

export interface UpdateWorkoutInput {
  startedAt?: string;
  endedAt?: string;
  title?: string | null;
}

export interface MergeExercisesResult {
  source: { id: string; name: string; retired: boolean };
  target: { id: string; name: string };
  reassignedSessionExercises: number;
  reassignedTemplateExercises: number;
  affectedWorkouts: number;
  affectedTemplates: number;
  affectedSets: number;
}

export interface CreateExerciseInput {
  name: string;
  equipment: string | null;
  exerciseType: string | null;
  primaryMuscleGroupIds: string[];
  secondaryMuscleGroupIds: string[];
  confirmNameWarning?: boolean;
}

export type UpdateExerciseInput = CreateExerciseInput;

export interface WorkoutTemplateExercise {
  id: string;
  position: number;
  exercise: Pick<Exercise, "id" | "name" | "equipment" | "exerciseType" | "muscleGroups">;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: WorkoutTemplateExercise[];
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
}

export interface ExerciseOptions {
  equipment: string[];
  exerciseTypes: string[];
}

export interface UserPreferences {
  volumeHeatCeiling: number;
}

export interface ExerciseNameReviewDetails {
  normalizedName: string;
  reasons: { code: string; message: string }[];
  suggestions: string[];
}
