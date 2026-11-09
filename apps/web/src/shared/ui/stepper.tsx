"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";
import { IconMinus, IconPlus } from "../shell/icons";

/**
 * Large-target numeric stepper for gym use: thumb-sized ± buttons with a
 * directly editable mono value in the middle.
 */
export function Stepper({
  label,
  onChange,
  step,
  unit,
  value,
  min = 0,
  decimals = false
}: {
  label: string;
  onChange: (next: string) => void;
  step: number;
  unit: string;
  value: string;
  min?: number;
  decimals?: boolean;
}): ReactNode {
  const numeric = Number(value);
  const rootRef = useRef<HTMLDivElement>(null);
  const dismissingKeyboard = useRef(false);

  function dismissActiveInput(event: PointerEvent<HTMLButtonElement>): void {
    const editor = rootRef.current?.closest<HTMLElement>("[data-set-inputs]");
    const active = document.activeElement;
    if (!(active instanceof HTMLInputElement) || !editor?.contains(active)) return;
    event.preventDefault();
    active.blur();
    dismissingKeyboard.current = true;
  }

  function handleNudge(direction: 1 | -1): void {
    if (dismissingKeyboard.current) {
      dismissingKeyboard.current = false;
      return;
    }
    nudge(direction);
  }

  function nudge(direction: 1 | -1): void {
    const base = Number.isNaN(numeric) ? 0 : numeric;
    const next = Math.max(min, base + direction * step);

    onChange(decimals ? String(Math.round(next * 100) / 100) : String(Math.round(next)));
  }

  return (
    <div className="min-w-0" ref={rootRef}>
      <p className="label-caps mb-1.5 text-outline">{label}</p>
      <div className="flex h-14 items-stretch overflow-hidden rounded border border-outline-dim bg-surface-low/60">
        <button
          aria-label={`Decrease ${label}`}
          className="flex w-12 shrink-0 cursor-pointer items-center justify-center border-r border-outline-dim text-fg-muted transition-colors active:bg-surface-high active:text-cyan"
          onClick={() => handleNudge(-1)}
          onPointerDown={dismissActiveInput}
          type="button"
        >
          <IconMinus height="20" width="20" />
        </button>
        <label className="relative flex min-w-0 flex-1 items-center justify-center">
          <span className="sr-only">{label}</span>
          <input
            className="w-full bg-transparent text-center font-mono text-xl font-medium tracking-[0.05em] text-cyan-bright focus:outline-none"
            inputMode={decimals ? "decimal" : "numeric"}
            onChange={(event) => onChange(event.currentTarget.value)}
            onFocus={(event) => event.currentTarget.select()}
            value={value}
          />
          <span className="pointer-events-none absolute bottom-1 text-[9px] uppercase tracking-[0.1em] text-outline">
            {unit}
          </span>
        </label>
        <button
          aria-label={`Increase ${label}`}
          className="flex w-12 shrink-0 cursor-pointer items-center justify-center border-l border-outline-dim text-fg-muted transition-colors active:bg-surface-high active:text-cyan"
          onClick={() => handleNudge(1)}
          onPointerDown={dismissActiveInput}
          type="button"
        >
          <IconPlus height="20" width="20" />
        </button>
      </div>
    </div>
  );
}
