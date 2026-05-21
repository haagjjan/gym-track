import { cookies } from "next/headers";
import { getApiBaseUrl } from "./api-base-url";
import { isAuthUser, type AuthUser } from "./auth-types";

interface CurrentUserPayload {
  data?: {
    user?: unknown;
  };
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieHeader = (await cookies()).toString();

  if (!cookieHeader) {
    return null;
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}/auth/me`, {
      headers: {
        accept: "application/json",
        cookie: cookieHeader
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as CurrentUserPayload;

    return isAuthUser(payload.data?.user) ? payload.data.user : null;
  } catch {
    return null;
  }
}
