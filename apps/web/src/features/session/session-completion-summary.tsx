"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import type { WorkoutDetail } from "../../shared/api/types";
import { formatDuration, formatNumber } from "../../shared/format";
import { Metric } from "../../shared/ui/ui";
import { CompletionTemplateActions } from "../templates/completion-template-actions";
import type { SessionTotals } from "./session-screen-support";
import { SessionTimePanel } from "./session-time-panel";
import { useOnboarding } from "../onboarding/use-onboarding";
import { MessageCenter } from "../messages/message-center";

export function SessionCompletionSummary({
  isSavingTime,
  onSaveTime,
  totals,
  workout
}: {
  isSavingTime: boolean;
  onSaveTime: (startedAt: string, endedAt: string) => Promise<unknown>;
  totals: SessionTotals;
  workout: WorkoutDetail & { endedAt: string };
}): ReactNode {
  const { mark } = useOnboarding();
  useEffect(() => { void mark("finishWorkout"); }, [mark]);
  return (<>
    <section
      aria-labelledby="workout-complete-title"
      className="rounded-xl border border-green/45 bg-green/5 p-4"
    >
      <p className="label-caps text-green">WORKOUT_COMPLETE</p>
      <h2 className="mt-1 font-display text-2xl font-bold text-fg" id="workout-complete-title">
        Session saved successfully
      </h2>
      <p className="mt-1 text-xs text-fg-muted">
        Your sets are in History and your analytics have been updated.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-outline-dim/50 bg-void/35 p-3 sm:grid-cols-4">
        <Metric label="DURATION" tone="green" value={formatDuration(workout.startedAt, workout.endedAt)} />
        <Metric label="EXERCISES" value={workout.exercises.length} />
        <Metric label="SETS" tone="lavender" value={totals.sets} />
        <Metric detail="kg total" label="TONNAGE" value={formatNumber(totals.volume)} />
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Link className="flex min-h-11 items-center justify-center rounded bg-cyan px-4 font-display text-xs font-bold uppercase tracking-[0.1em] text-on-cyan" href="/workouts">
          View History
        </Link>
        <Link className="flex min-h-11 items-center justify-center rounded border border-cyan/50 px-4 font-display text-xs font-bold uppercase tracking-[0.1em] text-cyan" href="/">
          Dashboard
        </Link>
      </div>

      <details className="mt-4 rounded-lg border border-outline-dim/60 bg-surface-low/30">
        <summary className="flex min-h-11 cursor-pointer items-center px-3 font-display text-xs font-bold uppercase tracking-[0.1em] text-fg-muted">
          Secondary post-workout actions
        </summary>
        <div className="space-y-3 border-t border-outline-dim/50 p-3">
          <CompletionTemplateActions workout={workout} />
          <SessionTimePanel
            endedAt={workout.endedAt}
            isSaving={isSavingTime}
            onSave={onSaveTime}
            startedAt={workout.startedAt}
          />
        </div>
      </details>
    </section>
    <MessageCenter />
  </>
  );
}
