"use client";

import type { ReactNode } from "react";
import type { TrackingModeFilterValue } from "../../shared/api/catalog-hooks";
import { radioGroupKeyDown } from "../../shared/ui/radio-group";

const LABELS: Record<Exclude<TrackingModeFilterValue, "strength">, string> = { "": "All", reps: "Weight & reps", time: "Time", cardio: "Cardio" };

/** Narrows an exercise list to how the exercises are logged: weight and reps, time, or cardio. */
export function TrackingModeFilter({ includeCardio = true, onChange, value }: {
  includeCardio?: boolean; onChange: (value: TrackingModeFilterValue) => void; value: TrackingModeFilterValue;
}): ReactNode {
  const options = (["", "reps", "time", "cardio"] as const).filter((option) => includeCardio || option !== "cardio");
  return (
    <div aria-label="Logged by" className="flex flex-wrap gap-1.5" onKeyDown={radioGroupKeyDown} role="radiogroup">
      {options.map((option) => (
        <button
          aria-checked={value === option}
          className={`min-h-11 flex-none rounded-full px-4 text-subhead transition-colors duration-200 ${value === option ? "bg-accent font-semibold text-on-accent" : "bg-surface text-text"}`}
          key={option}
          onClick={() => onChange(option)}
          role="radio"
          tabIndex={value === option ? 0 : -1}
          type="button"
        >
          {LABELS[option]}
        </button>
      ))}
    </div>
  );
}
