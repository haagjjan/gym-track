"use client";

import type { ReactNode } from "react";
import { IconMinus24, IconPlus24 } from "../../shared/ui/icons";

const MAX_SECONDS = 86_400;

/**
 * A duration as minutes and seconds, with plus and minus steps.
 * `value` is the total in seconds; holds step by 5 s, cardio by a minute.
 */
export function DurationInput({ disabled = false, onChange, step, value }: {
  disabled?: boolean; onChange: (seconds: number) => void; step: number; value: number;
}): ReactNode {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  const set = (next: number): void => onChange(Math.min(MAX_SECONDS, Math.max(0, Math.round(next))));
  const part = (text: string): number => { const parsed = Number(text.replace(/\D/g, "")); return Number.isFinite(parsed) ? parsed : 0; };

  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-subhead text-text-secondary">Duration</p>
      <div className={`flex h-14 items-stretch overflow-hidden rounded-[var(--radius-control)] border border-control-line bg-surface ${disabled ? "opacity-60" : ""}`}>
        <button aria-label="Decrease duration" className="flex w-12 flex-none items-center justify-center text-accent active:bg-surface-raised" disabled={disabled} onClick={() => set(value - step)} type="button">
          <IconMinus24 />
        </button>
        <label className="flex min-w-0 flex-1 items-center justify-center gap-1.5 border-l border-line px-2 focus-within:bg-surface-raised">
          <input aria-label="Minutes" className="num w-full min-w-0 bg-transparent text-right text-title-2 text-text focus:outline-none" disabled={disabled} inputMode="numeric"
            onChange={(event) => set(part(event.currentTarget.value) * 60 + seconds)} onFocus={(event) => event.currentTarget.select()} value={String(minutes)} />
          <span aria-hidden className="flex-none text-subhead text-text-secondary">min</span>
        </label>
        <label className="flex min-w-0 flex-1 items-center justify-center gap-1.5 border-x border-line px-2 focus-within:bg-surface-raised">
          <input aria-label="Seconds" className="num w-full min-w-0 bg-transparent text-right text-title-2 text-text focus:outline-none" disabled={disabled} inputMode="numeric"
            onChange={(event) => set(minutes * 60 + Math.min(59, part(event.currentTarget.value)))} onFocus={(event) => event.currentTarget.select()} value={String(seconds).padStart(2, "0")} />
          <span aria-hidden className="flex-none text-subhead text-text-secondary">sec</span>
        </label>
        <button aria-label="Increase duration" className="flex w-12 flex-none items-center justify-center text-accent active:bg-surface-raised" disabled={disabled} onClick={() => set(value + step)} type="button">
          <IconPlus24 />
        </button>
      </div>
    </div>
  );
}
