import type {
  ApiErrorPayload,
  Exercise,
  ExerciseNameReviewDetails,
  CsvImportPreview,
  ListExercisesPayload,
  ListMuscleGroupsPayload,
  ListWorkoutsPayload,
  SetType,
  WorkoutDetail,
  WorkoutSet
} from "./workout-types";

type ApiResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      status: number;
      code: string | undefined;
      message: string;
      fields: Record<string, string[]> | undefined;
      details: unknown;
    };

interface AddSetInput {
  setType: SetType;
  weightKg: string;
  reps: number;
  rir: number;
  restTimeSeconds: number | null;
  note: string | null;
}

interface CreateExerciseInput {
  name: string;
  equipment: string | null;
  exerciseType: string | null;
  primaryMuscleGroupId: string;
  secondaryMuscleGroupIds: string[];
  confirmNameWarning?: boolean;
}

type UpdateSetInput = Partial<AddSetInput>;

interface ListWorkoutsOptions {
  endDate?: string;
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
  startDate?: string;
}

interface CsvImportPayload {
  importedRows: number;
  importedWorkouts: number;
}

interface CsvPreviewPayload {
  preview: CsvImportPreview;
}

export async function listWorkouts(
  options: ListWorkoutsOptions = {}
): Promise<ApiResult<ListWorkoutsPayload>> {
  const params = new URLSearchParams({
    limit: String(options.limit ?? 20),
    offset: String(options.offset ?? 0)
  });

  if (options.startDate) {
    params.set("startDate", options.startDate);
  }

  if (options.endDate) {
    params.set("endDate", options.endDate);
  }

  return requestApi<ListWorkoutsPayload>(
    `/api/workouts?${params.toString()}`,
    withSignal(options.signal)
  );
}

export async function createWorkout(): Promise<ApiResult<{ workout: WorkoutDetail }>> {
  return requestApi<{ workout: WorkoutDetail }>("/api/workouts", {
    method: "POST",
    body: {}
  });
}

export async function getWorkout(
  workoutId: string,
  signal?: AbortSignal
): Promise<ApiResult<{ workout: WorkoutDetail }>> {
  return requestApi<{ workout: WorkoutDetail }>(
    `/api/workouts/${workoutId}`,
    withSignal(signal)
  );
}

export async function endWorkout(workoutId: string): Promise<ApiResult<{ workout: WorkoutDetail }>> {
  return requestApi<{ workout: WorkoutDetail }>(`/api/workouts/${workoutId}/end`, {
    method: "POST",
    body: {}
  });
}

export async function listExercises(
  search: string,
  signal?: AbortSignal
): Promise<ApiResult<ListExercisesPayload>> {
  const params = new URLSearchParams({
    limit: "20",
    offset: "0"
  });
  const trimmedSearch = search.trim();

  if (trimmedSearch.length > 0) {
    params.set("search", trimmedSearch);
  }

  return requestApi<ListExercisesPayload>(
    `/api/exercises?${params.toString()}`,
    withSignal(signal)
  );
}

export async function listMuscleGroups(
  signal?: AbortSignal
): Promise<ApiResult<ListMuscleGroupsPayload>> {
  return requestApi<ListMuscleGroupsPayload>("/api/muscle-groups", withSignal(signal));
}

export async function createExercise(
  input: CreateExerciseInput
): Promise<ApiResult<{ exercise: Exercise }>> {
  return requestApi<{ exercise: Exercise }>("/api/exercises", {
    method: "POST",
    body: input
  });
}

export function getExerciseNameReviewDetails(
  result: ApiResult<unknown>
): ExerciseNameReviewDetails | null {
  if (result.ok || !result.details || typeof result.details !== "object") {
    return null;
  }

  const details = result.details as Partial<ExerciseNameReviewDetails>;

  if (!Array.isArray(details.reasons) || !Array.isArray(details.suggestions)) {
    return null;
  }

  return {
    normalizedName: typeof details.normalizedName === "string" ? details.normalizedName : "",
    reasons: details.reasons,
    suggestions: details.suggestions
  };
}

export async function addSessionExercise(
  workoutId: string,
  exerciseId: string
): Promise<ApiResult<unknown>> {
  return requestApi(`/api/workouts/${workoutId}/exercises`, {
    method: "POST",
    body: { exerciseId }
  });
}

export async function reorderSessionExercises(
  workoutId: string,
  items: { sessionExerciseId: string; position: number }[]
): Promise<ApiResult<unknown>> {
  return requestApi(`/api/workouts/${workoutId}/exercises/reorder`, {
    method: "PATCH",
    body: { items }
  });
}

export async function deleteSessionExercise(
  workoutId: string,
  sessionExerciseId: string
): Promise<ApiResult<unknown>> {
  return requestApi(`/api/workouts/${workoutId}/exercises/${sessionExerciseId}`, {
    method: "DELETE"
  });
}

export async function addSet(
  workoutId: string,
  sessionExerciseId: string,
  input: AddSetInput
): Promise<ApiResult<{ set: WorkoutSet }>> {
  return requestApi<{ set: WorkoutSet }>(
    `/api/workouts/${workoutId}/exercises/${sessionExerciseId}/sets`,
    {
      method: "POST",
      body: input
    }
  );
}

export async function updateSet(
  setId: string,
  input: UpdateSetInput
): Promise<ApiResult<{ set: WorkoutSet }>> {
  return requestApi<{ set: WorkoutSet }>(`/api/sets/${setId}`, {
    method: "PATCH",
    body: input
  });
}

export async function deleteSet(setId: string): Promise<ApiResult<unknown>> {
  return requestApi(`/api/sets/${setId}`, {
    method: "DELETE"
  });
}

export async function importWorkoutCsv(file: File): Promise<ApiResult<CsvImportPayload>> {
  return postCsv<CsvImportPayload>("/api/workouts/import.csv", file);
}

export async function previewWorkoutCsv(file: File): Promise<ApiResult<CsvPreviewPayload>> {
  return postCsv<CsvPreviewPayload>("/api/workouts/import.csv/preview", file);
}

export async function confirmWorkoutCsvImport(
  file: File
): Promise<ApiResult<CsvImportPayload>> {
  return postCsv<CsvImportPayload>("/api/workouts/import.csv?confirmNameWarnings=true", file);
}

async function postCsv<T>(url: string, file: File): Promise<ApiResult<T>> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "text/csv"
    },
    body: await file.text()
  });
  const payload = await readJson(response);

  if (!response.ok) {
    return toApiError(response.status, payload);
  }

  return { ok: true, data: (payload as { data: T }).data };
}

async function requestApi<T>(
  url: string,
  options: {
    method?: "DELETE" | "GET" | "PATCH" | "POST";
    body?: unknown;
    signal?: AbortSignal;
  } = {}
): Promise<ApiResult<T>> {
  const init: RequestInit = {
    method: options.method ?? "GET"
  };

  if (options.body !== undefined) {
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(options.body);
  }

  if (options.signal !== undefined) {
    init.signal = options.signal;
  }

  const response = await fetch(url, init);
  const payload = await readJson(response);

  if (!response.ok) {
    return toApiError(response.status, payload);
  }

  return { ok: true, data: (payload as { data: T }).data };
}

function withSignal(signal: AbortSignal | undefined): { signal?: AbortSignal } {
  return signal ? { signal } : {};
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function toApiError(status: number, value: unknown): ApiResult<never> {
  const fallback = {
    ok: false as const,
    status,
    code: undefined,
    message: "Something went wrong.",
    fields: undefined,
    details: undefined
  };

  if (!isApiErrorPayload(value)) {
    return fallback;
  }

  return {
    ok: false,
    status,
    code: value.error.code,
    message: value.error.message ?? fallback.message,
    fields: value.error.fields,
    details: value.error.details
  };
}

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  if (!value || typeof value !== "object" || !("error" in value)) {
    return false;
  }

  const error = (value as { error?: unknown }).error;

  return typeof error === "object" && error !== null;
}
