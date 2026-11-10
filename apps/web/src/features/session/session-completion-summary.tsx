"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { WorkoutDetail } from "../../shared/api/types";
import { formatCompactNumber, formatMinutes } from "../../shared/format";
import { StatTile } from "../../shared/ui/stat-tile";
import { CompletionTemplateActions } from "../templates/completion-template-actions";
import type { SessionTotals } from "./session-screen-support";
import { WorkoutTimeSheet } from "./session-time-panel";
import { useOnboarding } from "../onboarding/use-onboarding";
import { MessageCenter } from "../messages/message-center";
import { IconCheck24, IconPencil } from "../../shared/ui/icons";

/** Top of a finished workout: the summary card, with the time editable from Duration. */
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
  const [editingTime, setEditingTime] = useState(false);
  useEffect(() => { void mark("finishWorkout"); }, [mark]);
  return (
    <>
      <CompletedWorkoutSummary onEditTime={() => setEditingTime(true)} totals={totals} workout={workout} />
      <WorkoutTimeSheet
        endedAt={workout.endedAt}
        isOpen={editingTime}
        isSaving={isSavingTime}
        onClose={() => setEditingTime(false)}
        onSave={onSaveTime}
        startedAt={workout.startedAt}
      />
    </>
  );
}

/** Bottom of a finished workout, under the exercises. */
export function SessionCompletionFooter({ workout }: { workout: WorkoutDetail }): ReactNode {
  return (
    <>
      <CompletionTemplateActions workout={workout} />
      <MessageCenter />
    </>
  );
}

export function CompletedWorkoutSummary({ totals, workout, example = false, onEditTime }: {
  totals: SessionTotals; workout: WorkoutDetail & { endedAt: string }; example?: boolean; onEditTime?: () => void;
}): ReactNode {
  const duration = formatMinutes(workout.startedAt, workout.endedAt);
  return (
    <section aria-labelledby="workout-complete-title" className="rounded-[var(--radius-card)] bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="min-w-0 text-title-1 text-text" id="workout-complete-title">
          {example ? "Example workout complete" : "Workout complete"}
        </h2>
        <p className="flex shrink-0 items-center gap-1 text-subhead font-semibold text-success">
          <IconCheck24 className="size-5" /> Saved
        </p>
      </div>
      <p className="mt-1 text-subhead text-text-secondary">
        {example
          ? "The example History, Progress and Volume now include this workout. Your account is unchanged."
          : "Shown in History, Progress and Volume."}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {onEditTime ? (
          <div className="min-w-0">
            <dt className="text-subhead text-text-secondary">Duration</dt>
            <dd className="mt-0.5">
              <button
                aria-label={`Duration ${duration}. Change workout time`}
                className="-mx-1 -my-1.5 inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-[var(--radius-control)] px-1 text-left active:bg-surface-raised"
                onClick={onEditTime}
                type="button"
              >
                <span className="num truncate text-title-2 text-text">{duration}</span>
                <IconPencil className="size-[18px] shrink-0 text-accent" />
              </button>
            </dd>
          </div>
        ) : (
          <StatTile label="Duration" value={duration} />
        )}
        <StatTile label="Exercises" value={workout.exercises.length} />
        <StatTile label="Sets" value={totals.sets} />
        <StatTile label="Volume" unit="kg" value={formatCompactNumber(totals.volume)} />
      </dl>
    </section>
  );
}
