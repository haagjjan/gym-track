import type { AuthErrorPayload } from "./auth-types";

export async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function parseAuthError(value: unknown): AuthErrorPayload {
  if (!value || typeof value !== "object" || !("error" in value)) {
    return { error: {} };
  }

  const error = (value as { error?: unknown }).error;

  if (!error || typeof error !== "object") {
    return { error: {} };
  }

  const candidate = error as {
    code?: unknown;
    message?: unknown;
    fields?: unknown;
  };

  return {
    error: {
      code: typeof candidate.code === "string" ? candidate.code : undefined,
      message: typeof candidate.message === "string" ? candidate.message : undefined,
      fields: isStringArrayRecord(candidate.fields) ? candidate.fields : undefined
    }
  };
}

function isStringArrayRecord(value: unknown): value is Record<string, string[]> {
  if (!value || typeof value !== "object") {
    return false;
  }

  return Object.values(value).every(
    (fieldErrors) =>
      Array.isArray(fieldErrors) && fieldErrors.every((message) => typeof message === "string")
  );
}
