"use client";

import { useState, type ReactNode } from "react";
import { Button } from "../../shared/ui/button";
import { ConfirmDialog } from "../../shared/ui/confirm-dialog";
import { errorMessage } from "../../shared/api/client";
import { useSessionMutations } from "../../shared/api/hooks";
import type { SessionExercise } from "../../shared/api/types";
import Link from "next/link";
import { IconPlus24, IconTrend } from "../../shared/ui/icons";
import { SetComposer } from "./set-composer";
import type { SetDraft } from "./set-draft-storage";
import { SessionEditorDock } from "./session-editor-dock";
import { SessionSetEditor, SessionSetRow } from "./session-set-list";
import { formatDay, formatKgValue } from "../../shared/format";
import { useOnboarding } from "../onboarding/use-onboarding";
import { TrackedEntries } from "../tracking/tracked-entries";

interface ActiveExercisePanelProps {
  canEdit: boolean;
  draft: SetDraft;
  editingSetId: string | null;
  exercise: SessionExercise;
  isNewSetOpen: boolean;
  mutations: ReturnType<typeof useSessionMutations>;
  onDraftChange: (patch: Partial<SetDraft>) => void;
  onEditSet: (setId: string | null) => void;
  onError: (message: string | null) => void;
  onNewSetOpen: (open: boolean) => void;
  onSaveSet: () => void;
  savedFlash: string | null;
  workoutEndedAt: string | null;
  workoutId: string;
}

export function ActiveExercisePanel(props: ActiveExercisePanelProps): ReactNode {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const { mark } = useOnboarding();
  const sets = props.exercise.sets;

  function removeExercise(): void {
    props.onError(null);
    props.mutations.removeExercise.mutate(
      { sessionExerciseId: props.exercise.id },
      {
        onSuccess: () => setConfirmRemove(false),
        onError: (caught) => {
          setConfirmRemove(false);
          props.onError(errorMessage(caught, "Couldn't remove this exercise. Check your connection and try again."));
        }
      }
    );
  }

  const tracked = Boolean(props.exercise.exercise.trackingMode);
  const editingSet = sets.find((set) => set.id === props.editingSetId) ?? null;

  return (
    <section aria-labelledby="active-exercise-title">
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-title-2 text-text" id="active-exercise-title">
            {props.exercise.exercise.name}
          </h2>
          <p className="mt-0.5 text-subhead text-text-secondary">
            {muscleList(props.exercise)}
          </p>
        </div>
        {/* Shortcut to this exercise's chart. The open workout stays one tap away (mini bar, Back). */}
        <Link
          aria-label={`${props.exercise.exercise.name} progress`}
          className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-surface px-3 text-subhead font-semibold text-accent active:bg-surface-raised"
          href={tracked ? `/progress?tracked=${encodeURIComponent(props.exercise.exercise.id)}&kind=${props.exercise.exercise.trackingMode}` : `/progress?exercise=${encodeURIComponent(props.exercise.exercise.id)}`}
        >
          <IconTrend /> Progress
        </Link>
      </header>

      {tracked ? (
        <TrackedEntries canEdit={props.canEdit} exercise={props.exercise} key={props.exercise.id} onError={props.onError} workoutId={props.workoutId} />
      ) : (
      <>
      <PreviousPerformance exercise={props.exercise} />

      <h3 className="mt-6 mb-2 px-1 text-footnote font-semibold text-text-secondary">
        {sets.length === 0 ? "Sets" : `${sets.length} ${sets.length === 1 ? "set" : "sets"}`}
      </h3>
      {sets.length > 0 ? (
        <ul aria-label="Logged sets" className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface">
          {sets.map((set) => (
            <SessionSetRow
              key={set.id}
              onEdit={() => {
                props.onNewSetOpen(false);
                props.onEditSet(set.id);
              }}
              set={set}
              workoutEndedAt={props.workoutEndedAt}
            />
          ))}
        </ul>
      ) : (
        <p className="rounded-[var(--radius-card)] bg-surface p-4 text-subhead text-text-secondary">
          {props.canEdit ? "No sets yet. Add your first set below." : "No sets were logged for this exercise."}
        </p>
      )}

      {editingSet ? (
        <SessionEditorDock key={editingSet.id} label={`Edit set ${editingSet.setOrder}`} onClose={() => props.onEditSet(null)}>
          <SessionSetEditor
            isHistorical={!props.canEdit}
            mutations={props.mutations}
            onClose={() => props.onEditSet(null)}
            onError={props.onError}
            onSaved={() => void mark("logEditSet")}
            set={editingSet}
          />
        </SessionEditorDock>
      ) : null}

      {props.canEdit ? (
        props.isNewSetOpen ? (
          <SessionEditorDock label="New set" onClose={() => props.onNewSetOpen(false)}>
            <SetComposer
              draft={props.draft}
              isSaving={props.mutations.addSet.isPending}
              onCancel={() => props.onNewSetOpen(false)}
              onChange={props.onDraftChange}
              onSave={props.onSaveSet}
              savedFlash={props.savedFlash}
            />
          </SessionEditorDock>
        ) : (
          <Button
            className="mt-3 w-full"
            onClick={() => {
              props.onEditSet(null);
              props.onNewSetOpen(true);
            }}
          >
            <IconPlus24 /> Add set
          </Button>
        )
      ) : null}
      </>
      )}

      {props.canEdit ? (
        <Button className="mt-8 w-full" onClick={() => setConfirmRemove(true)} size="compact" variant="destructive">
          Remove exercise
        </Button>
      ) : null}

      <ConfirmDialog
        confirmLabel="Remove exercise"
        isOpen={confirmRemove}
        isPending={props.mutations.removeExercise.isPending}
        message={props.exercise.exercise.trackingMode === "cardio" ? "Its entries in this workout are removed too." : "Its sets in this workout are removed too."}
        onCancel={() => setConfirmRemove(false)}
        onConfirm={removeExercise}
        pendingLabel="Removing…"
        title={`Remove ${props.exercise.exercise.name}?`}
      />
    </section>
  );
}

function muscleList(exercise: SessionExercise): string {
  const names = (exercise.exercise.primaryMuscleGroups ?? [exercise.exercise.primaryMuscleGroup]).map((muscle) => muscle.name);
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

function PreviousPerformance({ exercise }: { exercise: SessionExercise }): ReactNode {
  const previous = exercise.previousPerformance;
  return (
    <section aria-label="Previous best set" className="mt-4 flex items-center justify-between gap-3 rounded-[var(--radius-card)] bg-surface px-4 py-3">
      <div className="min-w-0">
        <p className="text-footnote text-text-secondary">Previous best set</p>
        <p className="mt-0.5 break-words text-subhead text-text-muted">
          {previous
            ? `${previous.workoutTitle?.trim() || "Earlier workout"}, ${formatDay(previous.workoutStartedAt)}`
            : "None yet. Your first working set sets it."}
        </p>
      </div>
      {previous ? (
        <span className="num flex-none text-headline text-text">
          {formatKgValue(previous.bestSet.weightKg)} kg × {previous.bestSet.reps}
        </span>
      ) : null}
    </section>
  );
}
