"use client";

import type { ReactNode } from "react";
import { IconBack, IconChevronDown } from "../../shared/ui/icons";

interface SessionModeNavigationProps {
  exerciseName: string;
  onBack: () => void;
  onNext: () => void;
  onPrevious: () => void;
  position: number;
  total: number;
}

const stepButton = "flex size-11 flex-none items-center justify-center rounded-full bg-surface text-accent active:bg-surface-raised disabled:text-text-muted disabled:opacity-50";

/** Back to the exercise list, plus previous and next exercise. */
export function SessionModeNavigation(props: SessionModeNavigationProps): ReactNode {
  return (
    <nav aria-label="Exercise navigation" className="mb-4 flex items-center gap-2">
      <button className="flex min-h-11 items-center gap-0.5 rounded-full pr-3 text-body text-accent active:bg-surface-raised" onClick={props.onBack} type="button">
        <IconBack /> Exercises
      </button>
      <p className="num min-w-0 flex-1 text-center text-footnote text-text-secondary">
        Exercise {props.position + 1} of {props.total}
      </p>
      <button aria-label="Previous exercise" className={stepButton} disabled={props.position <= 0} onClick={props.onPrevious} type="button">
        <IconChevronDown className="rotate-180" />
      </button>
      <button aria-label="Next exercise" className={stepButton} disabled={props.position >= props.total - 1} onClick={props.onNext} type="button">
        <IconChevronDown />
      </button>
    </nav>
  );
}
