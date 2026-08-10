"use client";

import { useState, type ReactNode } from "react";
import type { ChartMode } from "./progress-selection";

export function ProgressChartControls({ mode, onModeChange, onShowRepsChange, onShowWeightChange, showReps, showWeight }: { mode: ChartMode; onModeChange: (mode: ChartMode) => void; onShowRepsChange: (show: boolean) => void; onShowWeightChange: (show: boolean) => void; showReps: boolean; showWeight: boolean }): ReactNode {
  return (
    <div className="relative mb-2 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Chart mode">
        <ModeChip isActive={mode === "loadReps"} label="LOAD_REPS" onClick={() => onModeChange("loadReps")} />
        <span className="flex items-center"><ModeChip isActive={mode === "estimated"} label="EST_1RM" onClick={() => onModeChange("estimated")} /><InfoHint label="How estimated 1RM is calculated"><span className="block">Estimated 1RM projects the weight you could lift once from a working set. It becomes less reliable at high rep counts.</span><span className="mt-1 block font-mono text-fg">e1RM = weight × (1 + reps ÷ 30)</span><span className="mt-2 block text-outline">This is a calculation from sets you already recorded, not a recommendation to attempt that lift.</span></InfoHint></span>
      </div>
      {mode === "loadReps" ? <div className="flex gap-1.5"><SeriesChip color="cyan" isActive={showWeight} label="WEIGHT" onClick={() => { if (!showWeight && !showReps) return; onShowWeightChange(!showWeight); }} /><SeriesChip color="lavender" isActive={showReps} label="REPS" onClick={() => { if (!showReps && !showWeight) return; onShowRepsChange(!showReps); }} /></div> : null}
    </div>
  );
}

function ModeChip({ isActive, label, onClick }: { isActive: boolean; label: string; onClick: () => void }): ReactNode {
  return <button aria-checked={isActive} className={`min-h-8 cursor-pointer rounded border px-3 font-display text-[10px] font-bold uppercase tracking-[0.1em] transition-colors ${isActive ? "border-cyan bg-cyan/15 text-cyan" : "border-outline-dim text-outline"}`} onClick={onClick} role="radio" type="button">{label}</button>;
}

function SeriesChip({ color, isActive, label, onClick }: { color: "cyan" | "lavender"; isActive: boolean; label: string; onClick: () => void }): ReactNode {
  const activeClass = color === "cyan" ? "border-cyan/60 text-cyan" : "border-lavender/60 text-lavender";
  return <button aria-pressed={isActive} className={`min-h-8 cursor-pointer rounded border px-3 font-display text-[10px] font-bold uppercase tracking-[0.1em] transition-colors ${isActive ? activeClass : "border-outline-dim text-outline line-through"}`} onClick={onClick} type="button">{label}</button>;
}

function InfoHint({ children, label }: { children: ReactNode; label: string }): ReactNode {
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = focused || hovered || pinned;

  return <span className="static inline-flex"><button aria-expanded={open} aria-label={label} className="flex size-11 cursor-pointer items-center justify-center text-outline transition-colors hover:text-cyan" onBlur={() => { setFocused(false); setPinned(false); }} onClick={() => setPinned((value) => !value)} onFocus={() => setFocused(true)} onKeyDown={(event) => { if (event.key === "Escape") { setFocused(false); setHovered(false); setPinned(false); event.currentTarget.blur(); } }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} type="button"><span aria-hidden className="flex size-4 items-center justify-center rounded-full border border-current font-mono text-[10px]">i</span></button><span className={`absolute left-0 top-full z-30 w-full max-w-80 rounded-lg border border-outline-dim bg-surface p-3 text-xs leading-5 text-fg-muted shadow-2xl ${open ? "block" : "hidden"}`} role="tooltip">{children}</span></span>;
}
