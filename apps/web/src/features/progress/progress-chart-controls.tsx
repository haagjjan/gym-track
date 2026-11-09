"use client";

import { useState, type ReactNode } from "react";
import type { ChartMode } from "./progress-selection";
import { Segmented } from "./progress-segmented";

const modes: { label: string; value: ChartMode }[] = [
  { label: "Load & reps", value: "loadReps" },
  { label: "Est. 1RM", value: "estimated" }
];

export function ProgressChartControls({ mode, onModeChange, onShowRepsChange, onShowWeightChange, showReps, showWeight }: { mode: ChartMode; onModeChange: (mode: ChartMode) => void; onShowRepsChange: (show: boolean) => void; onShowWeightChange: (show: boolean) => void; showReps: boolean; showWeight: boolean }): ReactNode {
  return (
    <div className="relative mb-3 space-y-3">
      <div className="flex items-center gap-1">
        <div className="min-w-0 flex-1"><Segmented label="Chart mode" onChange={onModeChange} options={modes} value={mode} /></div>
        <InfoHint label="How estimated 1RM is calculated">
          <span className="block">Estimated 1RM projects the weight you could lift once from a working set. It becomes less reliable at high rep counts.</span>
          <span className="num mt-1 block text-text">e1RM = weight × (1 + reps ÷ 30)</span>
          <span className="mt-2 block text-text-muted">This is a calculation from sets you already recorded, not a recommendation to attempt that lift.</span>
        </InfoHint>
      </div>
      {mode === "loadReps" ? (
        <div className="flex flex-wrap gap-2">
          <SeriesChip colorClass="bg-accent" isActive={showWeight} label="Weight" onClick={() => { if (!showWeight && !showReps) return; onShowWeightChange(!showWeight); }} />
          <SeriesChip colorClass="bg-text-secondary" isActive={showReps} label="Reps" onClick={() => { if (!showReps && !showWeight) return; onShowRepsChange(!showReps); }} />
        </div>
      ) : null}
    </div>
  );
}

function SeriesChip({ colorClass, isActive, label, onClick }: { colorClass: string; isActive: boolean; label: string; onClick: () => void }): ReactNode {
  return (
    <button
      aria-pressed={isActive}
      className={`flex min-h-11 items-center gap-2 rounded-full bg-surface px-4 text-subhead transition-colors duration-200 ${isActive ? "font-semibold text-text" : "text-text-muted"}`}
      onClick={onClick}
      type="button"
    >
      <span aria-hidden className={`size-2.5 rounded-full ${isActive ? colorClass : "border border-text-muted"}`} />
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
