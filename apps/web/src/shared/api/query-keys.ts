export const queryKeys = {
  workouts: (limit: number) => ["workouts", limit] as const,
  workoutsInfinite: ["workouts-infinite"] as const,
  workout: (workoutId: string) => ["workout", workoutId] as const,
  completedExercises: ["completed-exercises"] as const,
  exerciseSummary: (
    exerciseId: string,
    startDate?: string,
    endDate?: string
  ) => ["exercise-summary", exerciseId, startDate ?? "all", endDate ?? "all"] as const,
  exerciseProgress: (exerciseId: string) => ["exercise-progress", exerciseId] as const,
  weeklyVolume: (startDate: string, endDate: string) => ["weekly-volume", startDate, endDate] as const,
  muscleGroups: ["muscle-groups"] as const,
  exerciseSearch: (search: string, muscleGroupId: string) => ["exercise-search", search, muscleGroupId] as const,
  templates: ["workout-templates"] as const,
  template: (templateId: string) => ["workout-template", templateId] as const,
  exerciseOptions: ["exercise-options"] as const,
  userPreferences: ["user-preferences"] as const,
  exerciseNameSuggestions: (name: string) => ["exercise-name-suggestions", name] as const
};

export function appendExerciseFilters(
  params: URLSearchParams,
  options: {
    search?: string;
    muscleGroupIds?: string[];
    equipment?: string;
    exerciseType?: string;
    ownership?: string;
    sort?: string;
  }
): void {
  if (options.search?.trim()) params.set("search", options.search.trim());
  options.muscleGroupIds?.forEach((id) => params.append("muscleGroupIds", id));
  if (options.equipment) params.set("equipment", options.equipment);
  if (options.exerciseType) params.set("exerciseType", options.exerciseType);
  if (options.ownership) params.set("ownership", options.ownership);
  if (options.sort) params.set("sort", options.sort);
}
