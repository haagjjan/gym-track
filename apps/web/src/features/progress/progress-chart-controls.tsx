"use client";

import { useState, type ReactNode } from "react";
import { IconTable, IconTrend } from "../../shared/ui/icons";
import type { ChartMode } from "./progress-selection";
import { Segmented } from "./progress-segmented";

const modes: { label: string; value: ChartMode }[] = [
  { label: "Load & reps", value: "loadReps" },
  { label: "Est. 1RM", value: "estimated" }
];

/** One row: what to plot, how it's calculated, and chart or table. */
export function ProgressChartControls({ mode, onModeChange, onViewChange, view }: {
  mode: ChartMode;
  onModeChange: (mode: ChartMode) => void;
  onViewChange: (view: "chart" | "table") => void;
  view: "chart" | "table";
}): ReactNode {
  return (
    <div className="relative flex items-center gap-1 px-1">
      <div className="min-w-0 flex-1"><Segmented label="Chart mode" onChange={onModeChange} options={modes} value={mode} /></div>
      <InfoHint label="How estimated 1RM is calculated">
        <span className="block">Estimated 1RM projects the weight you could lift once from a working set. It becomes less reliable at high rep counts.</span>
        <span className="num mt-1 block text-text">e1RM = weight × (1 + reps ÷ 30)</span>
        <span className="mt-2 block text-text-muted">This is a calculation from sets you already recorded, not a recommendation to attempt that lift.</span>
      </InfoHint>
      <button
        aria-label={view === "chart" ? "Show as table" : "Show as chart"}
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-text-secondary active:bg-surface-raised"
        onClick={() => onViewChange(view === "chart" ? "table" : "chart")}
        type="button"
      >
        {view === "chart" ? <IconTable /> : <IconTrend />}
      </button>
    </div>
  );
}

/**
 * The legend sits over the axis it belongs to: weight (kg) on the left in the
 * accent color, reps on the right in the reps color. Tapping toggles a line.
 */
export function SeriesLegend({ mode, onShowRepsChange, onShowWeightChange, showReps, showWeight }: {
  mode: ChartMode;
  onShowRepsChange: (show: boolean) => void;
  onShowWeightChange: (show: boolean) => void;
  showReps: boolean;
  showWeight: boolean;
}): ReactNode {
  if (mode === "estimated") {
    return <p className="flex min-h-11 items-center gap-2 px-2 text-subhead font-semibold text-accent"><Swatch className="bg-accent" isActive /> Est. 1RM, kg</p>;
  }
  return (
    <div className="flex items-center justify-between gap-2 px-2">
      <SeriesChip colorClass="bg-accent" isActive={showWeight} label="Weight, kg" onClick={() => { if (showWeight && !showReps) return; onShowWeightChange(!showWeight); }} textClass="text-accent" />
      <SeriesChip colorClass="bg-chart-reps" isActive={showReps} label="Reps" onClick={() => { if (showReps && !showWeight) return; onShowRepsChange(!showReps); }} reverse textClass="text-chart-reps" />
    </div>
  );
}

function Swatch({ className, isActive }: { className: string; isActive: boolean }): ReactNode {
  return <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${isActive ? className : "border border-text-muted"}`} />;
}

function SeriesChip({ colorClass, isActive, label, onClick, reverse = false, textClass }: { colorClass: string; isActive: boolean; label: string; onClick: () => void; reverse?: boolean; textClass: string }): ReactNode {
  return (
    <button
      aria-pressed={isActive}
      className={`flex min-h-11 items-center gap-2 rounded-full px-1 text-subhead transition-colors duration-200 ${reverse ? "flex-row-reverse" : ""} ${isActive ? `font-semibold ${textClass}` : "text-text-muted line-through decoration-text-muted/60"}`}
      onClick={onClick}
      type="button"
    >
      <Swatch className={colorClass} isActive={isActive} />
      {label}
    </button>
  );
}

function InfoHint({ children, label }: { children: ReactNode; label: string }): ReactNode {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        aria-expanded={open}
        aria-label={label}
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-text-secondary"
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}
        type="button"
      >
        <span aria-hidden className="flex size-5 items-center justify-center rounded-full border border-current text-caption">i</span>
      </button>
      <span className={`absolute inset-x-0 top-full z-30 mt-1 rounded-[var(--radius-card)] bg-surface-raised p-4 text-footnote text-text-secondary shadow-lg ${open ? "block" : "hidden"}`} role="tooltip">{children}</span>
    </>
  );
}
