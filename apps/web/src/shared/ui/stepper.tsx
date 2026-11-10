"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";
import { IconMinus24, IconPlus24 } from "./icons";

/**
 * Large-target numeric stepper for gym use: thumb-sized − and + buttons with
 * a directly editable value in the middle and the unit beside it.
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

  const name = label.toLowerCase();

  return (
    <div className="min-w-0" ref={rootRef}>
      <p className="mb-1.5 text-subhead text-text-secondary">{label}{unit !== name ? <span className="text-text-muted"> ({unit})</span> : null}</p>
      <div className="flex h-14 items-stretch overflow-hidden rounded-[var(--radius-control)] border border-control-line bg-surface">
        <button
          aria-label={`Decrease ${name}`}
          className="flex w-11 flex-none items-center justify-center text-accent active:bg-surface-raised"
          onClick={() => handleNudge(-1)}
          onPointerDown={dismissActiveInput}
          type="button"
        >
          <IconMinus24 />
        </button>
        <label className="flex min-w-0 flex-1 items-center border-x border-line px-1 focus-within:bg-surface-raised">
          <span className="sr-only">{unit !== name ? `${label}, ${unit}` : label}</span>
          {/* The unit sits in the label above, so the value gets the full width. */}
          <input
            className="num w-full min-w-0 bg-transparent text-center text-title-2 text-text focus:outline-none"
            inputMode={decimals ? "decimal" : "numeric"}
            onChange={(event) => onChange(event.currentTarget.value)}
            onFocus={(event) => event.currentTarget.select()}
            value={value}
          />
        </label>
        <button
          aria-label={`Increase ${name}`}
          className="flex w-11 flex-none items-center justify-center text-accent active:bg-surface-raised"
          onClick={() => handleNudge(1)}
          onPointerDown={dismissActiveInput}
          type="button"
        >
          <IconPlus24 />
        </button>
      </div>
    </div>
  );
}
