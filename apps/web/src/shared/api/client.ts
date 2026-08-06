export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly fields: Record<string, string[]> | undefined;
  readonly details: unknown;

  constructor(
    status: number,
    message: string,
    code?: string,
    fields?: Record<string, string[]>,
    details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.details = details;
  }
}

interface RequestOptions {
  method?: "DELETE" | "GET" | "PATCH" | "POST";
  body?: unknown;
  signal?: AbortSignal;
}

export async function apiFetch<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const init: RequestInit = { method: options.method ?? "GET" };

  if (options.body !== undefined) {
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(options.body);
  }

  if (options.signal) {
    init.signal = options.signal;
  }

  let response: Response;

  try {
    response = await fetch(url, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    throw new ApiError(0, "The connection to the Gym Progress Tracker API failed.");
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const envelope = extractErrorEnvelope(payload);

    throw new ApiError(
      response.status,
      envelope.message ?? "Something went wrong.",
      envelope.code,
      envelope.fields,
      envelope.details
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (payload as { data: T }).data;
}

function extractErrorEnvelope(payload: unknown): {
  code?: string;
  message?: string;
  fields?: Record<string, string[]>;
  details?: unknown;
} {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object"
  ) {
    return payload.error as ReturnType<typeof extractErrorEnvelope>;
  }

  return {};
}

export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  return fallback;
}
