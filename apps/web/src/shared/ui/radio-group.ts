import type { KeyboardEvent } from "react";

/**
 * Arrow-key behaviour for a radiogroup built from buttons (segmented controls,
 * chips): arrows move focus and selection together and wrap, as with native
 * radios. Pair it with tabIndex={checked ? 0 : -1} on each radio, so the group
 * is a single tab stop.
 */
export function radioGroupKeyDown(event: KeyboardEvent<HTMLElement>): void {
  const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
  if (step === 0) return;
  const radios = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]:not(:disabled)')];
  const current = radios.indexOf(document.activeElement as HTMLElement);
  if (current < 0 || radios.length === 0) return;
  event.preventDefault();
  const next = radios[(current + step + radios.length) % radios.length];
  next?.focus();
  next?.click();
}
