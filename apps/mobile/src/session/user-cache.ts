import { isAuthUser, type AuthUser } from "../../../web/src/features/auth/auth-types";
import { deviceGet, deviceRemove, deviceSet } from "../offline/device-store";
import { setOutboxUser } from "../../../web/src/shared/offline/outbox-store";

const USER_KEY = "gymtrack.app.user";

let current: AuthUser | null = null;
let checkedAt = 0;

/** The signed-in user as last confirmed by the API, kept so screens open without a wait. */
export function cachedUser(): AuthUser | null {
  if (current) {
    return current;
  }

  try {
    const stored: unknown = JSON.parse(deviceGet(USER_KEY) ?? "null");
    current = isAuthUser(stored) ? stored : null;
  } catch {
    current = null;
  }

  setOutboxUser(current?.id ?? null);

  return current;
}

export function rememberUser(user: AuthUser): void {
  current = user;
  checkedAt = Date.now();
  setOutboxUser(user.id);

  try {
    deviceSet(USER_KEY, JSON.stringify(user));
  } catch {
    // Storage can be unavailable; the in-memory copy still serves this run.
  }
}

export function forgetUser(): void {
  current = null;
  checkedAt = 0;
  // The queue itself stays on the phone and resumes when this user signs in again.
  setOutboxUser(null);

  try {
    deviceRemove(USER_KEY);
  } catch {
    // Nothing to remove.
  }
}

/** True when the API confirmed the user within the last minute. */
export function userIsFresh(): boolean {
  return current !== null && Date.now() - checkedAt < 60_000;
}
