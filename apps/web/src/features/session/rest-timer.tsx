"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { formatElapsedSeconds } from "../../shared/format";

const RING_RADIUS = 26;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * Auto-starting rest countdown shown after each saved set. Vibrates (where
 * supported) when rest is up so the phone can stay in a pocket.
 */
export function RestTimer({
  seconds,
  startedAt,
  onAdjust,
  onDismiss
}: {
  seconds: number;
  startedAt: number;
  onAdjust: (deltaSeconds: number) => void;
  onDismiss: () => void;
}): ReactNode {
  const [now, setNow] = useState(() => Date.now());
  const doneRef = useRef(false);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 250);

    return () => window.clearInterval(interval);
  }, []);

  const elapsed = (now - startedAt) / 1000;
  const remaining = Math.max(0, seconds - elapsed);
  const isDone = remaining <= 0;
  const fraction = seconds > 0 ? remaining / seconds : 0;

  useEffect(() => {
    if (isDone && !doneRef.current) {
      doneRef.current = true;

      if ("vibrate" in navigator) {
        navigator.vibrate?.([180, 90, 180]);
      }
    }

    if (!isDone) {
      doneRef.current = false;
    }
  }, [isDone]);

  return (
    <div
      className={`flex items-center gap-2 rounded-xl border bg-surface px-3 py-2 shadow-2xl transition-colors lg:gap-4 lg:px-4 lg:py-3 lg:shadow-none ${
        isDone
          ? "border-green/60 bg-green/10 shadow-glow-green"
          : "border-cyan/30 bg-surface-low/80"
      }`}
      role="timer"
    >
      <svg aria-hidden className="size-12 shrink-0 lg:size-16" viewBox="0 0 64 64">
        <circle
          cx="32"
          cy="32"
          fill="none"
          r={RING_RADIUS}
          stroke="rgba(58, 73, 75, 0.6)"
          strokeWidth="4"
        />
        <circle
          cx="32"
          cy="32"
          fill="none"
          r={RING_RADIUS}
          stroke={isDone ? "#51fb37" : "#00dbe7"}
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={RING_CIRCUMFERENCE * (1 - fraction)}
          strokeLinecap="round"
          strokeWidth="4"
          transform="rotate(-90 32 32)"
        />
      </svg>

      <div className="min-w-0 flex-1">
        <p className={`label-caps ${isDone ? "text-green" : "text-outline"}`}>
          {isDone ? "REST_COMPLETE // GO" : "REST_PROTOCOL"}
        </p>
        <p
          className={`font-mono font-medium tracking-[0.05em] ${
            isDone ? "text-green-bright" : "text-cyan-bright"
          } text-xl lg:text-2xl`}
        >
          {formatElapsedSeconds(remaining)}
        </p>
      </div>

      <div className="flex shrink-0 gap-2">
        {!isDone ? (
          <button
            className="min-h-11 cursor-pointer rounded border border-outline-dim px-3 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-fg-muted transition-colors hover:border-cyan hover:text-cyan"
            onClick={() => onAdjust(30)}
            type="button"
          >
            +30S
          </button>
        ) : null}
        <button
          className={`min-h-11 cursor-pointer rounded border px-3 font-display text-[11px] font-bold uppercase tracking-[0.1em] transition-colors ${
            isDone
              ? "border-green text-green hover:bg-green/10"
              : "border-outline-dim text-fg-muted hover:border-cyan hover:text-cyan"
          }`}
          onClick={onDismiss}
          type="button"
        >
          {isDone ? "DISMISS" : "SKIP"}
        </button>
      </div>
    </div>
  );
}
