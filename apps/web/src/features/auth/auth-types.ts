export interface AuthUser {
  id: string;
  email: string;
  username: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthErrorPayload {
  error: {
    code?: string | undefined;
    message?: string | undefined;
    fields?: Record<string, string[]> | undefined;
  };
}

export function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.email === "string" &&
    typeof candidate.username === "string" &&
    typeof candidate.emailVerified === "boolean" &&
    typeof candidate.createdAt === "string"
  );
}
