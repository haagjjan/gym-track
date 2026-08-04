"use client";

import type { ReactNode } from "react";
import { IconChevronRight } from "../shell/icons";

interface SessionModeNavigationProps {
  exerciseName: string;
  onBack: () => void;
  onNext: () => void;
  onPrevious: () => void;
  position: number;
  total: number;
}

export function SessionModeNavigation(props: SessionModeNavigationProps): ReactNode {
  return (
    <nav aria-label="Set mode exercise navigation" className="glass flex min-h-14 items-center gap-2 rounded-xl p-2">
      <button className="flex min-h-11 items-center gap-1 rounded px-2 font-display text-xs font-bold text-cyan hover:bg-cyan/10" onClick={props.onBack} type="button">
        <IconChevronRight className="rotate-180" /> Exercises
      </button>
      <div className="min-w-0 flex-1 text-center">
        <p className="truncate text-xs font-semibold text-fg">{props.exerciseName}</p>
        <p className="label-caps text-outline">SET MODE · {props.position + 1}/{props.total}</p>
      </div>
      <button aria-label="Previous exercise" className="flex size-11 items-center justify-center rounded border border-outline-dim text-cyan disabled:opacity-30" disabled={props.position <= 0} onClick={props.onPrevious} type="button">
        <IconChevronRight className="-rotate-90" />
      </button>
      <button aria-label="Next exercise" className="flex size-11 items-center justify-center rounded border border-outline-dim text-cyan disabled:opacity-30" disabled={props.position >= props.total - 1} onClick={props.onNext} type="button">
        <IconChevronRight className="rotate-90" />
      </button>
    </nav>
  );
}
