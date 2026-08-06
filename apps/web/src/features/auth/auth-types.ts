export interface AuthUser {
  id: string;
  email: string;
  username: string;
  emailVerified: boolean;
  role?: "USER" | "ADMIN";
  accountStatus?: "ACTIVE" | "DELETION_PENDING" | "SUSPENDED";
  betaCohort?: string | null;
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
    (candidate.role === undefined || candidate.role === "USER" || candidate.role === "ADMIN") &&
    (candidate.accountStatus === undefined || candidate.accountStatus === "ACTIVE" || candidate.accountStatus === "DELETION_PENDING" || candidate.accountStatus === "SUSPENDED") &&
    (candidate.betaCohort === undefined || typeof candidate.betaCohort === "string" || candidate.betaCohort === null) &&
    typeof candidate.createdAt === "string"
  );
}
