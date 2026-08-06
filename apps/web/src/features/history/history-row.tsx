"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { HudButton, Skeleton } from "../../shared/ui/ui";
import type { SessionExercise, WorkoutDetail, WorkoutSet, WorkoutSummary } from "../../shared/api/types";
import { cockpitLabel, formatDuration, formatKgValue, formatNumber, shortDate } from "../../shared/format";
import { isRetroactivelyEdited } from "../../shared/workout-edits";
import { IconChevronRight } from "../shell/icons";

export function HistoryRow({
  detail,
  isExpanded,
  onDelete,
  onToggle,
  workout
}: {
  detail: WorkoutDetail | undefined;
  isExpanded: boolean;
  onDelete: () => void;
  onToggle: () => void;
  workout: WorkoutSummary;
}): ReactNode {
  return (
    <li className={`rounded-xl border transition-colors ${workout.isOpen ? "border-cyan/60 bg-cyan/5" : "glass"} ${isExpanded ? "border-cyan/50" : ""}`}>
      <button aria-expanded={isExpanded} className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left" onClick={onToggle} type="button">
        <span className="w-20 shrink-0 font-mono text-[10px] uppercase text-outline">{shortDate(workout.startedAt)}</span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate font-display text-sm font-bold ${workout.isOpen ? "text-cyan" : "text-fg"}`}>
            {workout.isOpen ? "Workout in progress" : historyTitle(workout)}
          </span>
          <span className="block truncate text-xs text-fg-muted">
            {workout.exercisePreview.length > 0
              ? workout.exercisePreview.map((exercise) => exercise.name).join(" · ")
              : `${workout.totalExercises} exercises`}
          </span>
        </span>
        <dl className="hidden shrink-0 grid-cols-3 gap-4 text-right sm:grid">
          <MiniMetric label="Duration" value={formatDuration(workout.startedAt, workout.endedAt)} />
          <MiniMetric label="Tonnage" value={`${formatNumber(Number(workout.tonnageKg))} kg`} />
          <MiniMetric label="Sets" value={String(workout.totalSets)} />
        </dl>
        <IconChevronRight className={`shrink-0 text-outline transition-transform ${isExpanded ? "rotate-90" : ""}`} />
      </button>

      {isExpanded ? (
        <div className="border-t border-outline-dim/40 px-4 py-3">
          {!detail ? <Skeleton className="h-16" /> : detail.exercises.length === 0 ? (
            <p className="text-xs text-outline">No exercises recorded.</p>
          ) : (
            <div className="space-y-3">
              {detail.exercises.map((exercise) => <ExpandedExercise exercise={exercise} key={exercise.id} workoutEndedAt={detail.endedAt} />)}
            </div>
          )}
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-outline-dim/40 pt-3">
            <Link className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-cyan hover:text-cyan-bright" href={`/workouts/${workout.id}`}>Open full log <IconChevronRight /></Link>
            <HudButton onClick={onDelete} size="sm" variant="danger">{workout.isOpen ? "Discard" : "Delete"}</HudButton>
          </div>
        </div>
      ) : null}
    </li>
  );
}

function ExpandedExercise({ exercise, workoutEndedAt }: { exercise: SessionExercise; workoutEndedAt: string | null }): ReactNode {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="truncate text-xs font-medium text-fg"><span className="mr-2 font-mono text-[10px] text-outline">{exercise.position}</span>{exercise.exercise.name}</p>
        <p className="shrink-0 text-[10px] text-outline">{exercise.exercise.primaryMuscleGroups.map((muscle) => muscle.name).join(" · ")}</p>
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        {exercise.sets.length === 0 ? <span className="text-[10px] text-outline">No sets</span> : exercise.sets.map((set) => <SetPill key={set.id} set={set} workoutEndedAt={workoutEndedAt} />)}
      </div>
    </div>
  );
}

function SetPill({ set, workoutEndedAt }: { set: WorkoutSet; workoutEndedAt: string | null }): ReactNode {
  const edited = isRetroactivelyEdited(set, workoutEndedAt);
  return (
    <span className={`rounded-sm border px-1.5 py-0.5 font-mono text-[10px] ${set.setType === "warmup" ? "border-warmup/40 bg-warmup/5 text-warmup" : "border-lavender/40 bg-lavender/5 text-lavender"}`} title={edited ? "Modified after completion" : undefined}>
      {`${set.setOrder} · ${formatKgValue(set.weightKg)} kg × ${set.reps}`}{edited ? <span className="ml-1 text-cyan">✎</span> : null}
    </span>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }): ReactNode {
  return <div><dt className="text-[9px] uppercase tracking-[0.1em] text-outline">{label}</dt><dd className="font-mono text-xs text-fg">{value}</dd></div>;
}

function historyTitle(workout: WorkoutSummary): string {
  return cockpitLabel(workout.title ?? workout.workoutType ?? "Training workout");
}
