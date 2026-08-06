import { cookies, headers } from "next/headers";
import { getApiBaseUrl } from "../../shared/api-base-url";
import { isAuthUser, type AuthUser } from "./auth-types";
import { addBffClientAttribution } from "../../shared/bff-client-attribution";

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
    const upstreamHeaders = new Headers({ accept: "application/json", cookie: cookieHeader });
    addBffClientAttribution({ headers: await headers() }, upstreamHeaders);
    const response = await fetch(`${getApiBaseUrl()}/auth/me`, {
      headers: upstreamHeaders,
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
