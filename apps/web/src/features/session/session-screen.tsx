"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ConfirmDialog } from "../../shared/ui/confirm-dialog";
import { ErrorState } from "../../shared/ui/ui";
import { errorMessage } from "../../shared/api/client";
import { useSessionMutations, useWorkout, useWorkoutMutations } from "../../shared/api/hooks";
import type { SessionExercise } from "../../shared/api/types";
import { ActiveExercisePanel } from "./active-exercise-panel";
import { ExerciseSheet } from "./exercise-sheet";
import { clearWorkoutSetDrafts } from "./set-draft-storage";
import { SessionExerciseList } from "./session-exercise-list";
import { SessionHeader } from "./session-header";
import { SessionModeNavigation } from "./session-mode-navigation";
import { SessionCompletionSummary } from "./session-completion-summary";
import { calculateSessionTotals, resolveActiveExercise, SessionError, SessionSkeleton, SessionStats } from "./session-screen-support";
import { useSessionSetLogging } from "./use-session-set-logging";
import { useOnboarding } from "../onboarding/use-onboarding";

export function SessionScreen({
  focusName = false,
  userId,
  workoutId
}: {
  focusName?: boolean;
  userId: string;
  workoutId: string;
}): ReactNode {
  const router = useRouter();
  const { mark } = useOnboarding();
  const workoutQuery = useWorkout(workoutId);
  const mutations = useSessionMutations({ workoutId });
  const workoutMutations = useWorkoutMutations();
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
  const [sessionMode, setSessionMode] = useState<"exercises" | "sets">("exercises");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const exerciseMutationIds = useRef(new Map<string, string>());
  const workout = workoutQuery.data ?? null;
  const exercises = useMemo(() => workout?.exercises ?? [], [workout]);
  const activeExercise = resolveActiveExercise(exercises, activeExerciseId);
  const totals = useMemo(() => calculateSessionTotals(exercises), [exercises]);
  const logging = useSessionSetLogging({ activeExercise, mutations, onError: setActionError, onStatus: setStatus, userId, workoutId });
  const { closeEditors } = logging;

  useEffect(() => {
    if (workout?.isOpen) void mark("startWorkout");
  }, [mark, workout?.isOpen]);

  useEffect(() => {
    if (!exercises.some((item) => item.id === activeExerciseId)) {
      setActiveExerciseId(exercises[0]?.id ?? null);
      closeEditors();
      if (exercises.length === 0) setSessionMode("exercises");
    }
  }, [activeExerciseId, closeEditors, exercises]);

  async function addExercises(exerciseIds: string[]): Promise<boolean> {
    const added: SessionExercise[] = [];
    try {
      for (const exerciseId of exerciseIds) {
        const clientMutationId = exerciseMutationIds.current.get(exerciseId)
          ?? globalThis.crypto.randomUUID();
        exerciseMutationIds.current.set(exerciseId, clientMutationId);
        added.push(await mutations.addExercise.mutateAsync({ clientMutationId, exerciseId }));
      }
      const lastAdded = added.at(-1);
      if (lastAdded) setActiveExerciseId(lastAdded.id);
      closeEditors();
      setSheetOpen(false);
      setSessionMode("sets");
      setStatus(`${added.length} ${added.length === 1 ? "exercise" : "exercises"} added.`);
      exerciseMutationIds.current.clear();
      return true;
    } catch (caught) {
      setActionError(errorMessage(caught, "The exercise could not be added."));
      return false;
    }
  }

  function closeExerciseSheet(): void {
    exerciseMutationIds.current.clear();
    setSheetOpen(false);
  }

  function reorderExercises(activeId: string, overId: string): void {
    const from = exercises.findIndex((item) => item.id === activeId);
    const to = exercises.findIndex((item) => item.id === overId);
    if (from < 0 || to < 0) return;
    const reordered = [...exercises];
    const [moved] = reordered.splice(from, 1);
    if (!moved) return;
    reordered.splice(to, 0, moved);
    mutations.reorderExercises.mutate(
      { items: reordered.map((item, index) => ({ sessionExerciseId: item.id, position: index + 1 })) },
      { onError: (caught) => setActionError(errorMessage(caught, "Exercise reorder failed.")) }
    );
  }

  if (workoutQuery.isLoading) return <SessionSkeleton />;
  if (workoutQuery.isError || !workout) return <SessionError error={workoutQuery.error} retry={() => void workoutQuery.refetch()} />;

  const isOpen = workout.isOpen;

  return (
    <div className="min-h-dvh bg-void">
      <SessionHeader
        focusName={focusName}
        isEnding={workoutMutations.endWorkout.isPending}
        isOpen={isOpen}
        isRenaming={workoutMutations.updateWorkout.isPending}
        onDelete={() => setConfirmDelete(true)}
        onEnd={() => {
          workoutMutations.endWorkout.mutate(workout.id, {
            onSuccess: () => clearWorkoutSetDrafts(userId, workoutId),
            onError: (caught) => setActionError(errorMessage(caught, "The workout could not be completed."))
          });
        }}
        onRename={(title) => workoutMutations.updateWorkout.mutate(
          { workoutId: workout.id, input: { title } },
          { onError: (caught) => setActionError(errorMessage(caught, "The workout name could not be saved.")) }
        )}
        startedAt={workout.startedAt}
        title={workout.title}
      />

      <main className={`mx-auto grid w-full max-w-5xl gap-4 px-4 pt-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-6 ${logging.restTimer ? "pb-32 lg:pb-8" : "pb-4 lg:pb-8"}`}>
        <div className="min-w-0 space-y-4">
          {actionError ? <ErrorState message={actionError} title="ACTION_FAILED" /> : null}
          <p aria-live="polite" className="sr-only">{status}</p>

          {!isOpen && workout.endedAt ? (
            <SessionCompletionSummary
              isSavingTime={workoutMutations.updateWorkout.isPending}
              onSaveTime={(startedAt, endedAt) => workoutMutations.updateWorkout.mutateAsync({ workoutId, input: { startedAt, endedAt } })}
              totals={totals}
              workout={{ ...workout, endedAt: workout.endedAt }}
            />
          ) : null}

          <div className={sessionMode === "exercises" || !activeExercise ? "session-mode-back" : "session-mode-forward"} key={sessionMode}>
            {sessionMode === "exercises" || !activeExercise ? (
              <SessionExerciseList
              activeId={activeExercise?.id ?? null}
              canEdit={isOpen}
              exercises={exercises}
              isReordering={mutations.reorderExercises.isPending}
              onAdd={() => setSheetOpen(true)}
              onReorder={reorderExercises}
              onSelect={(id) => {
                setActiveExerciseId(id);
                closeEditors();
                setSessionMode("sets");
              }}
              />
            ) : (
              <>
                <SessionModeNavigation
                exerciseName={activeExercise.exercise.name}
                onBack={() => setSessionMode("exercises")}
                onNext={() => selectRelativeExercise(1)}
                onPrevious={() => selectRelativeExercise(-1)}
                position={exercises.findIndex((exercise) => exercise.id === activeExercise.id)}
                total={exercises.length}
                />
                <ActiveExercisePanel
                canEdit={isOpen}
                draft={logging.currentDraft()}
                editingSetId={logging.editingSetId}
                exercise={activeExercise}
                isNewSetOpen={logging.newSetOpen}
                mutations={mutations}
                onDraftChange={logging.updateDraft}
                onEditSet={logging.setEditingSetId}
                onError={setActionError}
                onNewSetOpen={(open) => open ? logging.openNewSet() : logging.cancelNewSet()}
                onRestAdjust={(seconds) => logging.setRestTimer((current) => current ? { ...current, seconds: current.seconds + seconds } : null)}
                onRestDismiss={() => logging.setRestTimer(null)}
                onSaveSet={() => { void logging.saveSet().then((saved) => { if (saved) void mark("logEditSet"); }); }}
                restTimer={logging.restTimer}
                savedFlash={null}
                workoutEndedAt={workout.endedAt}
                />
              </>
            )}
          </div>

        </div>

        <SessionStats exercises={exercises.length} totals={totals} />
      </main>

      <ExerciseSheet
        isOpen={sheetOpen && isOpen}
        isSubmitting={mutations.addExercise.isPending || mutations.createExercise.isPending}
        onAddSelected={addExercises}
        onClose={closeExerciseSheet}
        onCreate={async (input) => {
          const exercise = await mutations.createExercise.mutateAsync(input);
          await addExercises([exercise.id]);
          return exercise;
        }}
      />
      <ConfirmDialog
        confirmLabel={isOpen ? "DISCARD WORKOUT" : "DELETE LOG"}
        isOpen={confirmDelete}
        isPending={workoutMutations.deleteWorkout.isPending}
        message={isOpen ? "This workout and every logged set will be removed." : "This workout will be removed from history and analytics."}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          try {
            await workoutMutations.deleteWorkout.mutateAsync(workout.id);
            clearWorkoutSetDrafts(userId, workoutId);
            setConfirmDelete(false);
            router.replace("/workouts");
            router.refresh();
          } catch (caught) {
            setConfirmDelete(false);
            setActionError(errorMessage(caught, "The workout could not be deleted."));
          }
        }}
        title={isOpen ? "Discard this workout?" : "Delete this workout log?"}
      />
    </div>
  );

  function selectRelativeExercise(offset: -1 | 1): void {
    const index = exercises.findIndex((exercise) => exercise.id === activeExercise?.id);
    const next = exercises[index + offset];
    if (!next) return;
    setActiveExerciseId(next.id);
    closeEditors();
  }
}
