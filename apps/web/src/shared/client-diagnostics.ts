export type ClientDiagnosticEvent =
  | ClientApiRequestEvent
  | ClientRouteErrorEvent
  | ClientUnhandledErrorEvent
  | ClientUnhandledRejectionEvent
  | ProgressChartStateEvent;
export type ClientDiagnosticInput = ClientDiagnosticEvent extends infer Event
  ? Event extends ClientDiagnosticEvent
    ? Omit<Event, "clientEventId" | "occurredAt">
    : never
  : never;

interface ClientApiRequestEvent extends ClientDiagnosticBase {
  code?: string | undefined;
  durationMs: number;
  event: "client_api_request";
  method: string;
  ok: boolean;
  route: string;
  statusCode: number | null;
}

interface ClientRouteErrorEvent extends ClientDiagnosticBase {
  digest?: string | undefined;
  event: "client_route_error";
  message: string;
  route: string;
  stack?: string | undefined;
}

interface ClientUnhandledErrorEvent extends ClientDiagnosticBase {
  event: "client_unhandled_error";
  filename?: string | undefined;
  line?: number | undefined;
  message: string;
  route: string;
  stack?: string | undefined;
}

interface ClientUnhandledRejectionEvent extends ClientDiagnosticBase {
  event: "client_unhandled_rejection";
  message: string;
  route: string;
  stack?: string | undefined;
}

interface ProgressChartStateEvent extends ClientDiagnosticBase {
  chartMode: "estimated" | "loadReps";
  chartRowCount: number;
  clientWidth: number;
  event: "progress_chart_state";
  itemCount: number;
  reason: "data" | "metric" | "mode" | "scroll" | "window";
  route: string;
  scrollLeft: number;
  scrollWidth: number;
  selectedWindowValue: "7" | "30" | "90" | "all";
  visibleReps: boolean;
  visibleWeight: boolean;
  widthRatio: number;
}

interface ClientDiagnosticBase {
  clientEventId: string;
  occurredAt: string;
}

const maxDiagnosticEvents = 50;
const uuidPathSegmentPattern =
  /\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?=\/|$)/gi;
const diagnosticEvents: ClientDiagnosticEvent[] = [];

function areClientDiagnosticsEnabled(): boolean {
  return process.env.NODE_ENV !== "production"
    || process.env.NEXT_PUBLIC_CLIENT_DIAGNOSTICS === "1";
}

function createClientEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function recordClientDiagnostic(
  event: ClientDiagnosticInput
): ClientDiagnosticEvent | null {
  if (!areClientDiagnosticsEnabled()) {
    return null;
  }

  const nextEvent = {
    ...event,
    clientEventId: createClientEventId(),
    occurredAt: new Date().toISOString()
  } as ClientDiagnosticEvent;

  diagnosticEvents.push(nextEvent);
  if (diagnosticEvents.length > maxDiagnosticEvents) {
    diagnosticEvents.splice(0, diagnosticEvents.length - maxDiagnosticEvents);
  }

  return nextEvent;
}

export function readClientDiagnostics(): ClientDiagnosticEvent[] {
  return [...diagnosticEvents];
}

export function sanitizeDiagnosticRoute(value: string): string {
  try {
    const url = new URL(value, "http://local-diagnostics.invalid");

    return url.pathname.replace(uuidPathSegmentPattern, "/:id");
  } catch {
    return value.split("?")[0]?.replace(uuidPathSegmentPattern, "/:id") ?? value;
  }
}

export function currentDiagnosticRoute(): string {
  if (typeof window === "undefined") {
    return "server";
  }

  return sanitizeDiagnosticRoute(window.location.pathname);
}

export function logClientDiagnosticGroup(
  title: string,
  payload: Record<string, unknown>
): void {
  if (!areClientDiagnosticsEnabled()) {
    return;
  }

  const logger = console as Console & {
    groupCollapsed?: (label: string) => void;
    groupEnd?: () => void;
  };

  if (typeof logger.groupCollapsed === "function") {
    logger.groupCollapsed(title);
    console.error(payload);
    logger.groupEnd?.();
    return;
  }

  console.error(title, payload);
}
