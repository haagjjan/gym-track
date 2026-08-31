"use client";

import { useState, type ReactNode } from "react";
import { ConfirmDialog } from "../../shared/ui/confirm-dialog";
import { HudButton } from "../../shared/ui/ui";
import { errorMessage } from "../../shared/api/client";
import { useSessionMutations } from "../../shared/api/hooks";
import type { SessionExercise } from "../../shared/api/types";
import { IconPlus } from "../shell/icons";
import { RestTimer } from "./rest-timer";
import { SetComposer } from "./set-composer";
import type { SetDraft } from "./set-draft-storage";
import { SessionEditorDock, SessionTimerDock } from "./session-editor-dock";
import { SessionSetEditor, SessionSetRow } from "./session-set-list";
import { formatDateTime, formatKgValue } from "../../shared/format";
import { useOnboarding } from "../onboarding/use-onboarding";

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
  restTimer: { seconds: number; startedAt: number } | null;
  onRestAdjust: (seconds: number) => void;
  onRestDismiss: () => void;
  savedFlash: string | null;
  workoutEndedAt: string | null;
}

export function ActiveExercisePanel(props: ActiveExercisePanelProps): ReactNode {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const { mark } = useOnboarding();

  function removeExercise(): void {
    props.onError(null);
    props.mutations.removeExercise.mutate(
      { sessionExerciseId: props.exercise.id },
      {
        onSuccess: () => setConfirmRemove(false),
        onError: (caught) => {
          setConfirmRemove(false);
          props.onError(errorMessage(caught, "The exercise could not be removed."));
        }
      }
    );
  }

  return (
    <section className="glass rounded-xl p-4" role="tabpanel">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="break-words font-display text-xl font-bold tracking-tight text-fg">
            {props.exercise.exercise.name}
          </h2>
          <p className="mt-0.5 text-xs text-fg-muted">
            {(props.exercise.exercise.primaryMuscleGroups ?? [props.exercise.exercise.primaryMuscleGroup]).map((muscle) => muscle.name).join(" · ")}
            {` · ${props.exercise.sets.length} ${props.exercise.sets.length === 1 ? "set" : "sets"}`}
          </p>
        </div>
        {props.canEdit ? (
          <button
            className="min-h-11 rounded border border-outline-dim px-3 text-xs font-semibold text-outline hover:border-red hover:text-red"
            onClick={() => setConfirmRemove(true)}
            type="button"
          >
            Remove
          </button>
        ) : null}
      </header>

      <PreviousPerformance exercise={props.exercise} />

      <div className="mt-4 space-y-1.5">
        {props.exercise.sets.length === 0 && !props.isNewSetOpen ? (
          <p className="rounded-lg border border-dashed border-outline-dim p-4 text-center text-sm text-fg-muted">
            No sets logged yet.
          </p>
        ) : null}
        {props.exercise.sets.map((set) =>
          props.editingSetId === set.id ? (
            <SessionEditorDock key={set.id} label={`Edit set ${set.setOrder}`} onClose={() => props.onEditSet(null)}>
              <SessionSetEditor
                isHistorical={!props.canEdit}
                mutations={props.mutations}
                onClose={() => props.onEditSet(null)}
                onError={props.onError}
                onSaved={() => void mark("logEditSet")}
                set={set}
              />
            </SessionEditorDock>
          ) : (
            <SessionSetRow
              key={set.id}
              onEdit={() => {
                props.onNewSetOpen(false);
                props.onEditSet(set.id);
              }}
              set={set}
              workoutEndedAt={props.workoutEndedAt}
            />
          )
        )}
      </div>

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
          <HudButton
            className="mt-2 w-full"
            onClick={() => {
              props.onEditSet(null);
              props.onNewSetOpen(true);
            }}
            size="lg"
            variant="outline"
          >
            <IconPlus /> Add Set
          </HudButton>
        )
      ) : null}

      {props.restTimer && !props.isNewSetOpen && !props.editingSetId ? (
        <SessionTimerDock>
          <RestTimer
            onAdjust={props.onRestAdjust}
            onDismiss={props.onRestDismiss}
            seconds={props.restTimer.seconds}
            startedAt={props.restTimer.startedAt}
          />
        </SessionTimerDock>
      ) : null}

      <ConfirmDialog
        confirmLabel="REMOVE EXERCISE"
        isOpen={confirmRemove}
        isPending={props.mutations.removeExercise.isPending}
        message="This exercise and its logged sets will be removed from this workout."
        onCancel={() => setConfirmRemove(false)}
        onConfirm={removeExercise}
        title={`Remove ${props.exercise.exercise.name}?`}
      />
    </section>
  );
}

function PreviousPerformance({ exercise }: { exercise: SessionExercise }): ReactNode {
  const previous = exercise.previousPerformance;
  return (
    <section className="mt-3 rounded-lg border border-outline-dim/60 bg-surface-low/30 p-3" aria-label="Previous performance">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="label-caps text-outline">Previous best set</p>
          <p className="mt-0.5 break-words text-[10px] text-fg-muted">
            {previous
              ? `${previous.workoutTitle ?? "Previous workout"} · ${formatDateTime(previous.workoutStartedAt)}`
              : "No earlier completed working set"}
          </p>
        </div>
        {previous ? (
          <span className="shrink-0 rounded-sm border border-lavender/50 bg-lavender/5 px-2 py-1 font-mono text-xs text-lavender">
            {formatKgValue(previous.bestSet.weightKg)} kg × {previous.bestSet.reps}
          </span>
        ) : null}
      </div>
    </section>
  );
}
