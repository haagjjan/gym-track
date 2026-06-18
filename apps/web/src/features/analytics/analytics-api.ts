import type {
  ApiErrorPayload,
  ListCompletedExercisesPayload,
  ExerciseProgressPayload,
  ExerciseSummaryPayload,
  ListExercisesPayload,
  WeeklyVolumePayload
} from "./analytics-types";
import {
  recordClientDiagnostic,
  sanitizeDiagnosticRoute
} from "../../shared/client-diagnostics";

type ApiResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      status: number;
      code: string | undefined;
      message: string;
      fields: Record<string, string[]> | undefined;
    };
type ApiFailure = Extract<ApiResult<never>, { ok: false }>;

interface AnalyticsRangeOptions {
  endDate?: string;
  signal?: AbortSignal;
  startDate?: string;
}

interface ExerciseProgressOptions extends AnalyticsRangeOptions {
  includeWarmups?: boolean;
}

export async function listExercises(
  signal?: AbortSignal
): Promise<ApiResult<ListExercisesPayload>> {
  return requestApi<ListExercisesPayload>("/api/exercises?limit=100&offset=0", withSignal(signal));
}

export async function listCompletedExercises(
  signal?: AbortSignal
): Promise<ApiResult<ListCompletedExercisesPayload>> {
  return requestApi<ListCompletedExercisesPayload>(
    "/api/analytics/exercises",
    withSignal(signal)
  );
}

export async function getExerciseProgress(
  exerciseId: string,
  options: ExerciseProgressOptions = {}
): Promise<ApiResult<ExerciseProgressPayload>> {
  const params = dateRangeParams(options);

  params.set("includeWarmups", String(options.includeWarmups ?? false));

  return requestApi<ExerciseProgressPayload>(
    `/api/analytics/exercises/${exerciseId}/progress?${params.toString()}`,
    withSignal(options.signal)
  );
}

export async function getExerciseSummary(
  exerciseId: string,
  options: AnalyticsRangeOptions = {}
): Promise<ApiResult<ExerciseSummaryPayload>> {
  const params = dateRangeParams(options);

  return requestApi<ExerciseSummaryPayload>(
    `/api/analytics/exercises/${exerciseId}/summary?${params.toString()}`,
    withSignal(options.signal)
  );
}

export async function getWeeklyVolume(
  options: AnalyticsRangeOptions = {}
): Promise<ApiResult<WeeklyVolumePayload>> {
  const params = dateRangeParams(options);

  return requestApi<WeeklyVolumePayload>(
    `/api/analytics/weekly-volume?${params.toString()}`,
    withSignal(options.signal)
  );
}

async function requestApi<T>(
  url: string,
  options: { signal?: AbortSignal } = {}
): Promise<ApiResult<T>> {
  const init: RequestInit = { method: "GET" };
  const startedAt = Date.now();
  const method = "GET";

  if (options.signal !== undefined) {
    init.signal = options.signal;
  }

  let response: Response;

  try {
    response = await fetch(url, init);
  } catch (error) {
    recordApiDiagnostic({
      code: error instanceof Error ? error.name : "FETCH_ERROR",
      durationMs: Date.now() - startedAt,
      method,
      ok: false,
      statusCode: null,
      url
    });
    throw error;
  }

  const payload = await readJson(response);

  if (!response.ok) {
    const result = toApiError(response.status, payload);

    recordApiDiagnostic({
      code: result.code,
      durationMs: Date.now() - startedAt,
      method,
      ok: false,
      statusCode: response.status,
      url
    });

    return result;
  }

  recordApiDiagnostic({
    durationMs: Date.now() - startedAt,
    method,
    ok: true,
    statusCode: response.status,
    url
  });

  return { ok: true, data: (payload as { data: T }).data };
}

function recordApiDiagnostic({
  code,
  durationMs,
  method,
  ok,
  statusCode,
  url
}: {
  code?: string | undefined;
  durationMs: number;
  method: string;
  ok: boolean;
  statusCode: number | null;
  url: string;
}): void {
  recordClientDiagnostic({
    code,
    durationMs,
    event: "client_api_request",
    method,
    ok,
    route: sanitizeDiagnosticRoute(url),
    statusCode
  });
}

function dateRangeParams(options: AnalyticsRangeOptions): URLSearchParams {
  const params = new URLSearchParams();

  if (options.startDate) {
    params.set("startDate", options.startDate);
  }

  if (options.endDate) {
    params.set("endDate", options.endDate);
  }

  return params;
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

function toApiError(status: number, value: unknown): ApiFailure {
  const fallback = {
    ok: false as const,
    status,
    code: undefined,
    message: "Something went wrong.",
    fields: undefined
  };

  if (!isApiErrorPayload(value)) {
    return fallback;
  }

  return {
    ok: false,
    status,
    code: value.error.code,
    message: value.error.message ?? fallback.message,
    fields: value.error.fields
  };
}

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  if (!value || typeof value !== "object" || !("error" in value)) {
    return false;
  }

  const error = (value as { error?: unknown }).error;

  return typeof error === "object" && error !== null;
}
