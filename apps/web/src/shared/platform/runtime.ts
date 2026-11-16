/**
 * Which build this code runs in (ADR 0024). The mobile build sets
 * NEXT_PUBLIC_RUNTIME=app; the web build leaves it unset. Feature code asks this
 * module and never reads the variable itself.
 */
export function isAppRuntime(): boolean {
  return process.env.NEXT_PUBLIC_RUNTIME === "app";
}
