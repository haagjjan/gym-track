import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,128}$/;
const UNMATCHED_ROUTE = "unmatched";

interface RequestErrorDetails {
  errorType: string;
  errorCode: string;
  errorStack?: string;
}

export function createRequestId(header: string | string[] | undefined): string {
  const candidate = Array.isArray(header) ? header[0] : header;

  return candidate && SAFE_REQUEST_ID.test(candidate) ? candidate : randomUUID();
}

export function registerApiRequestLogging(server: FastifyInstance): void {
  const requestErrors = new WeakMap<FastifyRequest, RequestErrorDetails>();

  server.addHook("onRequest", (request, reply, done) => {
    reply.header("x-request-id", request.id);
    done();
  });

  server.addHook("onError", (request, _reply, error, done) => {
    requestErrors.set(request, safeErrorDetails(error));
    done();
  });

  server.addHook("onResponse", (request, reply, done) => {
    logCompletedRequest(request, reply, requestErrors.get(request));
    requestErrors.delete(request);
    done();
  });
}

function logCompletedRequest(
  request: FastifyRequest,
  reply: FastifyReply,
  error?: RequestErrorDetails
): void {
  const payload = {
    event: error ? "request_failed" : "request_completed",
    request_id: request.id,
    method: request.method,
    normalized_route: request.routeOptions.url ?? UNMATCHED_ROUTE,
    status_code: reply.statusCode,
    duration_ms: roundedDuration(reply.elapsedTime),
    ...(error
      ? {
          error_type: error.errorType,
          error_code: error.errorCode,
          ...(error.errorStack ? { error_stack: error.errorStack } : {})
        }
      : {})
  };

  if (error || reply.statusCode >= 500) {
    request.log.error(payload, "request failed");
    return;
  }

  request.log.info(payload, "request completed");
}

function safeErrorDetails(error: Error & { code?: unknown }): RequestErrorDetails {
  const stack = error.stack?.split("\n").slice(1).join("\n").trim();

  return {
    errorType: error.name || "Error",
    errorCode: typeof error.code === "string" ? error.code : "UNEXPECTED_ERROR",
    ...(stack ? { errorStack: stack.slice(0, 8_000) } : {})
  };
}

function roundedDuration(durationMs: number): number {
  return Math.round(Math.max(durationMs, 0) * 1_000) / 1_000;
}
