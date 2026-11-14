import type { FastifyInstance, FastifyRequest } from "fastify";

/** Mobile app transport (ADR 0023) and minimum client version (ADR 0024). */
export interface MobileClientOptions {
  /** Origins of the bundled app, for example `capacitor://localhost`. */
  origins: readonly string[];
  /** Lowest app version the API still serves, as `major.minor.patch`. */
  minAppVersion?: string;
}

declare module "fastify" {
  interface FastifyRequest {
    /** True when the request identified itself as the bundled mobile app. */
    mobileClient: boolean;
  }
}

const CLIENT_HEADER = "x-gym-client";
const VERSION_HEADER = "x-app-version";
const ALLOWED_METHODS = "GET, POST, PATCH, DELETE, OPTIONS";
const ALLOWED_HEADERS = "Authorization, Content-Type, X-Gym-Client, X-App-Version, X-Request-Id";
const EXPOSED_HEADERS = "Content-Disposition, X-Request-Id";
const PREFLIGHT_MAX_AGE_SECONDS = "600";

/**
 * Registers the app transport. Without this call the API never reads the
 * `Authorization` header and never answers CORS, so the web contract is unchanged.
 * Must be registered before any hook that rejects requests, because browsers send
 * preflights without custom headers.
 */
export function registerMobileClient(server: FastifyInstance, options: MobileClientOptions): void {
  const origins = new Set(options.origins);
  const minVersion = options.minAppVersion ? parseVersion(options.minAppVersion) : null;

  server.decorateRequest("mobileClient", false);
  server.addHook("onRequest", async (request, reply) => {
    const origin = singleHeader(request.headers.origin);
    const allowedOrigin = origin !== null && origins.has(origin);

    if (allowedOrigin) {
      // No Access-Control-Allow-Credentials: cookies never travel on this path.
      void reply.header("access-control-allow-origin", origin);
      void reply.header("access-control-expose-headers", EXPOSED_HEADERS);
      void reply.header("vary", "Origin");
    }

    if (request.method === "OPTIONS" && request.headers["access-control-request-method"]) {
      if (!allowedOrigin) {
        return reply.status(403).send({
          error: { code: "CORS_NOT_ALLOWED", message: "This origin is not allowed." }
        });
      }

      return reply
        .header("access-control-allow-methods", ALLOWED_METHODS)
        .header("access-control-allow-headers", ALLOWED_HEADERS)
        .header("access-control-max-age", PREFLIGHT_MAX_AGE_SECONDS)
        .status(204)
        .send();
    }

    if (singleHeader(request.headers[CLIENT_HEADER]) !== "app") {
      return;
    }

    request.mobileClient = true;

    if (minVersion && !isHealthPath(request.url)) {
      const version = parseVersion(singleHeader(request.headers[VERSION_HEADER]) ?? "");

      if (!version || compareVersions(version, minVersion) < 0) {
        return reply.status(426).send({
          error: { code: "APP_UPDATE_REQUIRED", message: "Update GymTrack to keep going." }
        });
      }
    }
  });
}

/** True when the app transport is registered and the request used it. */
export function isMobileClient(request: FastifyRequest): boolean {
  return request.mobileClient === true;
}

/**
 * The raw session token of a request. App requests authenticate with the bearer
 * token only: their cookie is ignored, so a browser cannot be tricked into an
 * authenticated cross-origin request through the app path.
 */
export function sessionTokenFrom(request: FastifyRequest, cookieName: string): string | undefined {
  if (isMobileClient(request)) {
    return bearerToken(request.headers.authorization);
  }

  return request.cookies[cookieName];
}

export function bearerToken(header: string | undefined): string | undefined {
  const match = /^Bearer ([A-Za-z0-9._~+/=-]{16,512})$/.exec(header ?? "");

  return match?.[1];
}

type Version = readonly [number, number, number];

export function parseVersion(value: string): Version | null {
  const match = /^(\d{1,5})\.(\d{1,5})\.(\d{1,5})$/.exec(value.trim());

  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

export function compareVersions(left: Version, right: Version): number {
  for (let index = 0; index < 3; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);

    if (difference !== 0) {
      return difference;
    }
  }

  return 0;
}

function isHealthPath(url: string): boolean {
  return url.split("?", 1)[0] === "/api/v1/health";
}

function singleHeader(value: string | string[] | undefined): string | null {
  return typeof value === "string" ? value.trim() : null;
}
