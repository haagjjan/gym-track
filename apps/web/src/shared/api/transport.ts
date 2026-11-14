import { isAppRuntime } from "../platform/runtime";

/**
 * One place where browser code reaches the API (ADR 0023, ADR 0024).
 *
 * On the web a path like `/api/workouts` is same-origin and handled by the BFF.
 * In the bundled app there is no BFF: the same path is sent to `apps/api` with
 * the session token from the device's secure storage.
 */
export interface SessionTokenStore {
  /** Loads the stored token once at startup. */
  load(): Promise<string | null>;
  save(token: string): Promise<void>;
  clear(): Promise<void>;
}

export type SessionEvent = "started" | "ended" | "expired";

export interface AppTransportConfig {
  /** Origin of apps/api as the phone reaches it, for example `https://app.gymtrack.ch`. */
  apiOrigin: string;
  /** App version as `major.minor.patch`, sent as `X-App-Version`. */
  appVersion: string;
  tokenStore: SessionTokenStore;
  /**
   * The session changed: "started" after login or signup, "ended" after logout,
   * "expired" when the API no longer accepts the token (expired or revoked).
   */
  onSessionChange?: (event: SessionEvent) => void;
  /** The API no longer serves this app version. */
  onUpdateRequired?: () => void;
  /** Whether the last request reached the API at all (any response counts). */
  onReachabilityChange?: (reachable: boolean) => void;
  /**
   * The device's secure storage refused a write. After a failed "save" the session
   * lasts until the app closes; after a failed "clear" the store must drop the
   * token itself on the next start.
   */
  onStorageError?: (operation: "save" | "clear") => void;
}

interface TransportState {
  config: AppTransportConfig;
  token: Promise<string | null>;
  /**
   * Counts session changes. A response may only change the session it was sent
   * under, so a slow 401 cannot sign out a newer login and a slow login cannot
   * bring a session back after logout.
   */
  generation: number;
}

let state: TransportState | null = null;

/** BFF paths whose API path is not simply `/api/v1/<same>`. */
const PATH_OVERRIDES: Readonly<Record<string, string>> = {
  "/api/public-status": "/api/v1/status-metrics"
};

const SESSION_START_PATHS = new Set(["/api/auth/login", "/api/auth/signup"]);
const LOGOUT_PATH = "/api/auth/logout";

export function configureAppTransport(config: AppTransportConfig): void {
  state = { config, token: config.tokenStore.load().catch(() => null), generation: 0 };
}

/** True once a stored session token is available. Always false on the web. */
export async function hasAppSession(): Promise<boolean> {
  return state ? (await state.token) !== null : false;
}

/** Maps a BFF path to the API URL the app calls. Exported for tests. */
export function appApiUrl(url: string, apiOrigin: string): string {
  if (!url.startsWith("/api/")) {
    return url;
  }

  const queryStart = url.indexOf("?");
  const path = queryStart === -1 ? url : url.slice(0, queryStart);
  const query = queryStart === -1 ? "" : url.slice(queryStart);
  const mapped = PATH_OVERRIDES[path] ?? `/api/v1/${path.slice("/api/".length)}`;

  return `${apiOrigin.replace(/\/+$/, "")}${mapped}${query}`;
}

function pathOf(url: string): string {
  const queryStart = url.indexOf("?");

  return queryStart === -1 ? url : url.slice(0, queryStart);
}

/**
 * `fetch` for the app's own API. Every browser-side API call goes through here,
 * directly or through `apiFetch`.
 */
export async function apiRequest(url: string, init: RequestInit = {}): Promise<Response> {
  if (!isAppRuntime() || !state || !url.startsWith("/api/")) {
    return fetch(url, init);
  }

  const current = state;
  const path = pathOf(url);
  const token = await current.token;
  const generation = path === LOGOUT_PATH ? (current.generation += 1) : current.generation;
  const headers = new Headers(init.headers);

  headers.set("x-gym-client", "app");
  headers.set("x-app-version", current.config.appVersion);

  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }

  // Cookies play no part in the app: the API ignores them on app requests.
  let response: Response;

  try {
    response = await fetch(appApiUrl(url, current.config.apiOrigin), {
      ...init,
      headers,
      credentials: "omit"
    });
  } catch (error) {
    if (!(error instanceof DOMException && error.name === "AbortError")) {
      current.config.onReachabilityChange?.(false);
    }

    throw error;
  }

  current.config.onReachabilityChange?.(true);

  if (response.status === 426) {
    current.config.onUpdateRequired?.();
    return response;
  }

  if (SESSION_START_PATHS.has(path) && response.ok) {
    if (current.generation === generation) {
      await storeSessionFrom(response.clone(), current);
    }

    return response;
  }

  if (path === LOGOUT_PATH) {
    await forgetSession(current);
    current.config.onSessionChange?.("ended");
    return response;
  }

  if (response.status === 401 && token && !SESSION_START_PATHS.has(path) && current.generation === generation) {
    await forgetSession(current);
    current.config.onSessionChange?.("expired");
  }

  return response;
}

async function storeSessionFrom(response: Response, current: TransportState): Promise<void> {
  const payload = (await response.json().catch(() => null)) as { data?: { sessionToken?: unknown } } | null;
  const token = payload?.data?.sessionToken;

  if (typeof token !== "string" || token.length === 0) {
    return;
  }

  current.generation += 1;
  current.token = Promise.resolve(token);

  try {
    await current.config.tokenStore.save(token);
  } catch {
    current.config.onStorageError?.("save");
  }

  current.config.onSessionChange?.("started");
}

async function forgetSession(current: TransportState): Promise<void> {
  current.generation += 1;
  current.token = Promise.resolve(null);

  try {
    await current.config.tokenStore.clear();
  } catch {
    current.config.onStorageError?.("clear");
  }
}

/** Test hook: drops the configured transport. */
export function resetAppTransport(): void {
  state = null;
}
