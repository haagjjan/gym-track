import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from "prom-client";

const METRIC_PREFIX = "gym_progress_tracker_";
const METRICS_ROUTE = "/api/v1/metrics";
const UNMATCHED_ROUTE = "unmatched";
const SERVICE_NAME = "api";
const TRACKED_METHODS = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT", "OTHER"] as const;
const HTTP_DURATION_BUCKETS_SECONDS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

type TrackedMethod = (typeof TRACKED_METHODS)[number];

interface RequestLabels {
  method: TrackedMethod;
  route: string;
}

export interface ApiMetricsOptions {
  environment: string;
  release: string;
}

export function registerApiMetrics(
  server: FastifyInstance,
  options?: ApiMetricsOptions
): void {
  if (!options) return;

  const registry = createRegistry(options);
  const metrics = createHttpMetrics(registry);
  const activeRequests = new WeakMap<FastifyRequest, RequestLabels>();

  server.addHook("onRequest", (request, _reply, done) => {
    const route = normalizedRoute(request);
    if (route === METRICS_ROUTE) return done();

    const labels = { method: normalizedMethod(request.method), route };
    activeRequests.set(request, labels);
    metrics.requests.inc(labels);
    metrics.inFlight.inc({ method: labels.method });
    done();
  });

  server.addHook("onResponse", (request, reply, done) => {
    finishResponse(activeRequests, metrics, request, reply);
    done();
  });

  server.addHook("onRequestAbort", (request, done) => {
    clearInFlight(activeRequests, metrics.inFlight, request);
    done();
  });

  server.addHook("onTimeout", (request, _reply, done) => {
    clearInFlight(activeRequests, metrics.inFlight, request);
    done();
  });

  server.get(METRICS_ROUTE, async (_request, reply) => {
    return reply.type(registry.contentType).send(await registry.metrics());
  });
}

function createRegistry(options: ApiMetricsOptions): Registry {
  const registry = new Registry();
  registry.setDefaultLabels({
    service: SERVICE_NAME,
    environment: options.environment,
    release: options.release
  });
  collectDefaultMetrics({ prefix: METRIC_PREFIX, register: registry });

  const buildInfo = new Gauge({
    name: `${METRIC_PREFIX}build_info`,
    help: "Build and deployment identity for the API process.",
    registers: [registry]
  });
  buildInfo.set(1);

  return registry;
}

function createHttpMetrics(registry: Registry) {
  const requests = new Counter<"method" | "route">({
    name: `${METRIC_PREFIX}http_requests_total`,
    help: "HTTP requests received by method and normalized route.",
    labelNames: ["method", "route"],
    registers: [registry]
  });
  const responses = new Counter<"method" | "route" | "status_class">({
    name: `${METRIC_PREFIX}http_responses_total`,
    help: "HTTP responses sent by method, normalized route, and status class.",
    labelNames: ["method", "route", "status_class"],
    registers: [registry]
  });
  const duration = new Histogram<"method" | "route" | "status_class">({
    name: `${METRIC_PREFIX}http_request_duration_seconds`,
    help: "HTTP request duration in seconds by method, normalized route, and status class.",
    labelNames: ["method", "route", "status_class"],
    buckets: HTTP_DURATION_BUCKETS_SECONDS,
    registers: [registry]
  });
  const inFlight = new Gauge<"method">({
    name: `${METRIC_PREFIX}http_requests_in_flight`,
    help: "HTTP requests currently being processed by method.",
    labelNames: ["method"],
    registers: [registry]
  });

  for (const method of TRACKED_METHODS) inFlight.labels(method).set(0);
  return { requests, responses, duration, inFlight };
}

function finishResponse(
  activeRequests: WeakMap<FastifyRequest, RequestLabels>,
  metrics: ReturnType<typeof createHttpMetrics>,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  const labels = activeRequests.get(request);
  if (!labels) return;

  activeRequests.delete(request);
  metrics.inFlight.dec({ method: labels.method });
  const responseLabels = { ...labels, status_class: statusClass(reply.statusCode) };
  metrics.responses.inc(responseLabels);
  metrics.duration.observe(responseLabels, Math.max(reply.elapsedTime, 0) / 1_000);
}

function clearInFlight(
  activeRequests: WeakMap<FastifyRequest, RequestLabels>,
  inFlight: Gauge<"method">,
  request: FastifyRequest
): void {
  const labels = activeRequests.get(request);
  if (!labels) return;

  activeRequests.delete(request);
  inFlight.dec({ method: labels.method });
}

function normalizedRoute(request: FastifyRequest): string {
  return request.routeOptions.url ?? UNMATCHED_ROUTE;
}

function normalizedMethod(method: string): TrackedMethod {
  const normalized = method.toUpperCase();
  return TRACKED_METHODS.find((candidate) => candidate === normalized) ?? "OTHER";
}

function statusClass(statusCode: number): string {
  const category = Math.floor(statusCode / 100);
  return category >= 1 && category <= 5 ? `${category}xx` : "other";
}
