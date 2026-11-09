"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import type { WorkoutDetail } from "../../shared/api/types";
import { formatMinutes, formatNumber } from "../../shared/format";
import { buttonClass } from "../../shared/ui/button";
import { StatTile } from "../../shared/ui/stat-tile";
import { CompletionTemplateActions } from "../templates/completion-template-actions";
import type { SessionTotals } from "./session-screen-support";
import { SessionTimePanel } from "./session-time-panel";
import { useOnboarding } from "../onboarding/use-onboarding";
import { MessageCenter } from "../messages/message-center";
import { IconCheck24 } from "../../shared/ui/icons";

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
  return (
    <>
      <CompletedWorkoutSummary totals={totals} workout={workout} />
      <section aria-label="More for this workout" className="divide-y divide-line rounded-[var(--radius-card)] bg-surface px-4">
        <div className="py-4"><CompletionTemplateActions workout={workout} /></div>
        <div className="py-4">
          <SessionTimePanel endedAt={workout.endedAt} isSaving={isSavingTime} onSave={onSaveTime} startedAt={workout.startedAt} />
        </div>
      </section>
      <MessageCenter />
    </>
  );
}

export function CompletedWorkoutSummary({ totals, workout, example = false }: {
  totals: SessionTotals; workout: WorkoutDetail & { endedAt: string }; example?: boolean;
}): ReactNode {
  return (
    <section aria-labelledby="workout-complete-title" className="rounded-[var(--radius-card)] bg-surface p-4">
      <p className="flex items-center gap-1.5 text-subhead font-semibold text-success">
        <IconCheck24 className="size-5" /> Saved
      </p>
      <h2 className="mt-1 text-title-1 text-text" id="workout-complete-title">
        {example ? "Example workout complete" : "Workout complete"}
      </h2>
      <p className="mt-1 text-subhead text-text-secondary">
        {example
          ? "The example History, Progress and Volume now include this workout. Your account is unchanged."
          : "It's in your history, and Progress and Volume are up to date."}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Duration" value={formatMinutes(workout.startedAt, workout.endedAt)} />
        <StatTile label="Exercises" value={workout.exercises.length} />
        <StatTile label="Sets" value={totals.sets} />
        <StatTile label="Volume" unit="kg" value={formatNumber(totals.volume)} />
      </dl>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Link className={buttonClass("primary")} href={example ? "/help/demo/history" : "/workouts"}>
          View history
        </Link>
        <Link className={buttonClass("secondary")} href={example ? "/help/demo" : "/"}>
          Home
        </Link>
      </div>
    </section>
  );
}
