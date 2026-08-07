import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from "prom-client";
import type { MailDeliveryObserver, MailKind } from "./mailer.js";

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

export type LifecyclePhase = "auth" | "beta" | "deletion" | "notification" | "retention";

export interface OperationalMetrics extends MailDeliveryObserver {
  lifecycleFinished(durationSeconds: number, deletionBacklog: number, finalizedDeletions: number, succeeded: boolean): void;
  lifecyclePhaseFailed(phase: LifecyclePhase): void;
  lifecycleStarted(startedAt: Date): void;
}

export const noopOperationalMetrics: OperationalMetrics = {
  lifecycleFinished() {},
  lifecyclePhaseFailed() {},
  lifecycleStarted() {},
  record() {}
};

export function registerApiMetrics(
  server: FastifyInstance,
  options?: ApiMetricsOptions
): OperationalMetrics {
  if (!options) return noopOperationalMetrics;

  const registry = createRegistry(options);
  const metrics = createHttpMetrics(registry);
  const operationalMetrics = createOperationalMetrics(registry);
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

  return operationalMetrics;
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

function createOperationalMetrics(registry: Registry): OperationalMetrics {
  const emailDeliveries = new Counter<"kind" | "outcome">({
    name: `${METRIC_PREFIX}email_deliveries_total`,
    help: "Transactional email delivery attempts by bounded message kind and outcome.",
    labelNames: ["kind", "outcome"],
    registers: [registry]
  });
  const emailDuration = new Histogram<"kind" | "outcome">({
    name: `${METRIC_PREFIX}email_delivery_duration_seconds`,
    help: "Transactional email provider request duration by bounded message kind and outcome.",
    labelNames: ["kind", "outcome"],
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [registry]
  });
  const lifecycleLastStart = new Gauge({
    name: `${METRIC_PREFIX}lifecycle_cleanup_last_start_timestamp_seconds`,
    help: "Unix timestamp of the latest lifecycle cleanup start.",
    registers: [registry]
  });
  const lifecycleLastSuccess = new Gauge({
    name: `${METRIC_PREFIX}lifecycle_cleanup_last_success_timestamp_seconds`,
    help: "Unix timestamp of the latest fully successful lifecycle cleanup.",
    registers: [registry]
  });
  const lifecycleDuration = new Gauge({
    name: `${METRIC_PREFIX}lifecycle_cleanup_last_duration_seconds`,
    help: "Duration of the latest lifecycle cleanup run.",
    registers: [registry]
  });
  const lifecycleFailures = new Counter<"phase">({
    name: `${METRIC_PREFIX}lifecycle_cleanup_phase_failures_total`,
    help: "Lifecycle cleanup failures by bounded phase.",
    labelNames: ["phase"],
    registers: [registry]
  });
  const deletionBacklog = new Gauge({
    name: `${METRIC_PREFIX}lifecycle_due_deletions`,
    help: "Deletion-pending accounts still due after the latest lifecycle run.",
    registers: [registry]
  });
  const finalizedDeletions = new Counter({
    name: `${METRIC_PREFIX}lifecycle_finalized_deletions_total`,
    help: "Accounts permanently finalized by lifecycle cleanup.",
    registers: [registry]
  });

  return {
    lifecycleStarted(startedAt) {
      lifecycleLastStart.set(startedAt.getTime() / 1_000);
    },
    lifecyclePhaseFailed(phase) {
      lifecycleFailures.inc({ phase });
    },
    lifecycleFinished(durationSeconds, backlogCount, finalizedCount, succeeded) {
      lifecycleDuration.set(durationSeconds);
      deletionBacklog.set(backlogCount);
      finalizedDeletions.inc(finalizedCount);
      if (succeeded) lifecycleLastSuccess.set(Date.now() / 1_000);
    },
    record(kind: MailKind, outcome, durationSeconds) {
      emailDeliveries.inc({ kind, outcome });
      emailDuration.observe({ kind, outcome }, durationSeconds);
    }
  };
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
