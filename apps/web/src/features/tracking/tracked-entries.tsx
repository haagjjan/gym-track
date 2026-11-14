"use client";

import { useState, type ReactNode } from "react";
import { errorMessage } from "../../shared/api/client";
import type { SessionExercise } from "../../shared/api/types";
import { Button } from "../../shared/ui/button";
import { IconForward, IconPlus24 } from "../../shared/ui/icons";
import { ErrorState, Skeleton } from "../../shared/ui/ui";
import { SessionEditorDock } from "../session/session-editor-dock";
import { CardioForm } from "./cardio-form";
import { TimedSetForm } from "./timed-set-form";
import { cardioDetail, cardioLabel, timedLabel, type CardioEntry, type CardioValues, type TimedEntry, type TimedValues } from "./tracking-types";
import { useTracking } from "./use-tracking";

/**
 * The sets of a time or cardio exercise, in the same place and shape as the
 * sets of a weight-and-reps exercise: a list, one "Add" button, tap to edit.
 */
export function TrackedEntries({ canEdit, exercise, onError, workoutId }: {
  canEdit: boolean; exercise: SessionExercise; onError: (message: string | null) => void; workoutId: string;
}): ReactNode {
  const tracking = useTracking(workoutId);
  const [editor, setEditor] = useState<"new" | string | null>(null);
  const cardio = exercise.exercise.trackingMode === "cardio";
  const kind = cardio ? "cardio" as const : "timed-sets" as const;
  const noun = cardio ? "entry" : "set";
  const exerciseId = exercise.exercise.id;
  const entries: Array<TimedEntry | CardioEntry> = (cardio ? tracking.entries.data?.cardioEntries : tracking.entries.data?.timedSets)
    ?.filter((entry) => entry.exerciseId === exerciseId) ?? [];
  const editing = entries.find((entry) => entry.id === editor);
  const close = (): void => { tracking.abandonCreate(); setEditor(null); };

  function save(values: TimedValues | CardioValues): void {
    onError(null);
    tracking.save.mutate({ kind, values, entry: editing }, {
      onSuccess: close,
      onError: (caught) => onError(errorMessage(caught, `Couldn't save this ${noun}. Check your connection and try again.`))
    });
  }

  function remove(): void {
    if (!editing) return;
    onError(null);
    tracking.remove.mutate({ kind, entry: editing }, {
      onSuccess: close,
      onError: (caught) => { close(); onError(errorMessage(caught, `Couldn't delete this ${noun}. Check your connection and try again.`)); }
    });
  }

  if (tracking.entries.isLoading) return <Skeleton className="mt-6 h-24 rounded-[var(--radius-card)]" />;
  if (tracking.entries.isError) return <div className="mt-6"><ErrorState message={`Couldn't load the ${cardio ? "entries" : "sets"} for this exercise.`} retry={() => void tracking.entries.refetch()} /></div>;

  const formProps = {
    exerciseId, onCancel: close, pending: tracking.save.isPending || tracking.remove.isPending,
    title: editing ? `Edit ${noun} ${entries.indexOf(editing) + 1}` : `New ${noun}`
  };

  return (
    <>
      <h3 className="mt-6 mb-2 px-1 text-footnote font-semibold text-text-secondary">
        {entries.length === 0 ? (cardio ? "Entries" : "Sets") : `${entries.length} ${entries.length === 1 ? noun : cardio ? "entries" : "sets"}`}
      </h3>
      {entries.length > 0 ? (
        <ul aria-label={cardio ? "Logged entries" : "Logged sets"} className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface">
          {entries.map((entry, index) => {
            const label = "setType" in entry ? timedLabel(entry) : cardioLabel(entry);
            const detail = "setType" in entry ? (entry.setType === "warmup" ? "Warm-up" : "") : cardioDetail(entry);
            return (
              <li key={entry.id}>
                <button
                  aria-label={`${cardio ? "Entry" : "Set"} ${index + 1}: ${label}${detail ? `, ${detail}` : ""}. Edit`}
                  className="flex min-h-[3.25rem] w-full items-center gap-3 px-4 text-left active:bg-surface-raised"
                  onClick={() => { tracking.abandonCreate(); setEditor(entry.id); }}
                  type="button"
                >
                  <span aria-hidden className="num flex size-7 flex-none items-center justify-center rounded-full bg-surface-raised text-footnote font-semibold text-text">{index + 1}</span>
                  <span aria-hidden className="min-w-0 flex-1 py-1.5">
                    <span className="num block text-body text-text">{label}</span>
                    {detail || entry.note ? <span className="block break-words text-footnote text-text-muted">{[detail, entry.note].filter(Boolean).join(" · ")}</span> : null}
                  </span>
                  <IconForward aria-hidden className="flex-none text-text-muted" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-[var(--radius-card)] bg-surface p-4 text-subhead text-text-secondary">
          {canEdit ? `No ${cardio ? "entries" : "sets"} yet. Add your first ${noun} below.` : `Nothing was logged for this exercise.`}
        </p>
      )}

      {editor !== null ? (
        <SessionEditorDock key={editor} label={formProps.title} onClose={close}>
          {cardio
            ? <CardioForm {...formProps} entry={editing as CardioEntry | undefined} initial={entries.at(-1) as CardioEntry | undefined} onDelete={editing ? remove : undefined} onSave={save} />
            : <TimedSetForm {...formProps} entry={editing as TimedEntry | undefined} initial={entries.at(-1) as TimedEntry | undefined} onDelete={editing ? remove : undefined} onSave={save} />}
        </SessionEditorDock>
      ) : canEdit ? (
        <Button className="mt-3 w-full" onClick={() => { tracking.abandonCreate(); setEditor("new"); }}>
          <IconPlus24 /> Add {noun}
        </Button>
      ) : null}
    </>
  );
}
