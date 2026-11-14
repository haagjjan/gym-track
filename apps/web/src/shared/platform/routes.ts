import { isAppRuntime } from "./runtime";

/**
 * Link to one workout. The web uses a path parameter. The bundled app is a static
 * export and cannot pre-render per-workout pages, so it uses a query parameter
 * (ADR 0024).
 */
export function workoutHref(workoutId: string, options: { focusName?: boolean } = {}, app = isAppRuntime()): string {
  const id = encodeURIComponent(workoutId);

  if (app) {
    return `/workouts/session/?id=${id}${options.focusName ? "&focusName=1" : ""}`;
  }

  return `/workouts/${id}${options.focusName ? "?focusName=1" : ""}`;
}
