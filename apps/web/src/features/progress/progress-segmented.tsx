import type { ReactNode } from "react";
import { radioGroupKeyDown } from "../../shared/ui/radio-group";

/** Segmented control (DESIGN.md, Components): equal segments, 44 px tall, selected one is a raised pill. */
export function Segmented<T extends string>({
  label,
  onChange,
  options,
  tone = "page",
  value
}: {
  label: string;
  onChange: (next: T) => void;
  options: { label: string; value: T }[];
  /** "card" sinks the track to the page color so it stays visible inside a surface card. */
  tone?: "page" | "card";
  value: T;
}): ReactNode {
  return (
    <div
      aria-label={label}
      className={`grid gap-1 rounded-full p-1 ${tone === "card" ? "bg-bg" : "bg-surface"}`}
      onKeyDown={radioGroupKeyDown} role="radiogroup"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => (
        <button
          aria-checked={value === option.value}
          className={`min-h-11 rounded-full px-3 text-subhead transition-colors max-[359px]:px-2 max-[359px]:text-footnote duration-200 ${value === option.value ? "bg-surface-raised font-semibold text-text shadow-sm" : "text-text-secondary"}`}
          key={option.value}
          onClick={() => onChange(option.value)}
          role="radio"
          tabIndex={(value === option.value) ? 0 : -1}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
