import { randomUUID } from "node:crypto";

const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,128}$/;
const IDENTIFIER_SEGMENT = /^(?:\d+|[0-9a-f]{8}-[0-9a-f-]{27,})$/i;

interface RequestLike {
  method: string;
  headers: Headers;
}

export interface BffRequestContext {
  requestId: string;
  method: string;
  normalizedRoute: string;
  startedAt: number;
}

interface BffFailure {
  statusCode: number;
  errorCode: "UPSTREAM_5XX" | "API_UNAVAILABLE";
  error?: unknown;
}

type LogWriter = (message: string) => void;

export function createBffRequestContext(
  request: RequestLike,
  targetPath: string
): BffRequestContext {
  const suppliedId = request.headers.get("x-request-id")?.trim();

  return {
    requestId: suppliedId && SAFE_REQUEST_ID.test(suppliedId) ? suppliedId : randomUUID(),
    method: request.method.toUpperCase(),
    normalizedRoute: normalizeTargetPath(targetPath),
    startedAt: performance.now()
  };
}

export function forwardBffRequestId(headers: Headers, context: BffRequestContext): void {
  headers.set("x-request-id", context.requestId);
}

export function finalizeBffResponse<T extends Response>(
  context: BffRequestContext,
  response: T
): T {
  response.headers.set("x-request-id", context.requestId);
  if (response.status >= 500) {
    logBffFailure(context, {
      statusCode: response.status,
      errorCode: "UPSTREAM_5XX"
    });
  }
  return response;
}

export function logBffFailure(
  context: BffRequestContext,
  failure: BffFailure,
  writer: LogWriter = (message) => console.error(message)
): void {
  writer(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "error",
    service: "web",
    environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "unknown",
    version: process.env.APP_RELEASE ?? "unknown",
    event: "bff_proxy_error",
    request_id: context.requestId,
    method: context.method,
    normalized_route: context.normalizedRoute,
    upstream_service: "api",
    status_code: failure.statusCode,
    duration_ms: roundedDuration(performance.now() - context.startedAt),
    error_type: safeErrorType(failure.error),
    error_code: failure.errorCode
  }));
}

function normalizeTargetPath(targetPath: string): string {
  const segments = targetPath.replace(/^\/+/, "").split("/");
  return `/api/${segments.map(normalizeSegment).join("/")}`;
}

function normalizeSegment(segment: string): string {
  return IDENTIFIER_SEGMENT.test(segment) ? ":id" : segment;
}

function safeErrorType(error: unknown): string {
  return error instanceof Error && error.name ? error.name : "UpstreamError";
}

function roundedDuration(durationMs: number): number {
  return Math.round(Math.max(durationMs, 0) * 1_000) / 1_000;
}
