"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { formatClock } from "../../shared/format";

const RING_RADIUS = 18;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const adjustButton = "min-h-11 min-w-11 rounded-full bg-surface-raised px-3 text-subhead text-text active:opacity-70";

/**
 * Rest countdown that starts after each saved set. Vibrates (where supported)
 * when rest is up, so the phone can stay in a pocket.
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
    <div className="flex items-center gap-3" role="timer" aria-label="Rest timer">
      <svg aria-hidden className="size-11 flex-none" viewBox="0 0 44 44">
        <circle cx="22" cy="22" fill="none" r={RING_RADIUS} stroke="var(--line)" strokeWidth="3.5" />
        <circle
          cx="22"
          cy="22"
          fill="none"
          r={RING_RADIUS}
          stroke={isDone ? "var(--success)" : "var(--accent)"}
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={RING_CIRCUMFERENCE * (1 - fraction)}
          strokeLinecap="round"
          strokeWidth="3.5"
          transform="rotate(-90 22 22)"
        />
      </svg>

      <div className="min-w-0 flex-1">
        <p className="text-footnote text-text-secondary">{isDone ? "Rest over" : "Rest"}</p>
        <p className={`num text-title-3 ${isDone ? "text-success" : "text-text"}`} data-testid="rest-remaining">
          {formatClock(remaining)}
        </p>
      </div>

      <div className="flex flex-none gap-2">
        {!isDone ? (
          <>
            {/* Quarter-minute steps, matching the rest length in Settings. */}
            <button aria-label="Shorten rest by 15 seconds" className={adjustButton} onClick={() => onAdjust(-15)} type="button">
              −15 s
            </button>
            <button aria-label="Extend rest by 15 seconds" className={adjustButton} onClick={() => onAdjust(15)} type="button">
              +15 s
            </button>
          </>
        ) : null}
        <button className={`${adjustButton} text-accent`} onClick={onDismiss} type="button">
          {isDone ? "Done" : "Skip"}
        </button>
      </div>
    </div>
  );
}
