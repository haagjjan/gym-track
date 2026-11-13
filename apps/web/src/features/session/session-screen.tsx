"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../shared/api/client";
import type { TrackingPayload } from "../tracking/tracking-types";
import { WorkoutTracking } from "../tracking/workout-tracking";
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
import { SessionBottomBar } from "./session-bottom-bar";
import { SessionHeader } from "./session-header";
import { RestTimer } from "./rest-timer";
import { SessionModeNavigation } from "./session-mode-navigation";
import { SessionCompletionFooter, SessionCompletionSummary } from "./session-completion-summary";
import { calculateSessionTotals, resolveActiveExercise, SessionError, SessionSkeleton, SessionStats } from "./session-screen-support";
import { useSessionSetLogging } from "./use-session-set-logging";
import { useOnboarding } from "../onboarding/use-onboarding";

export function SessionScreen({
  extendedTracking = false,
  focusName = false,
  userId,
  workoutId
}: {
  extendedTracking?: boolean;
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
  const [followActive, setFollowActive] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const exerciseMutationIds = useRef(new Map<string, string>());
  const workout = workoutQuery.data ?? null;
  const exercises = useMemo(() => workout?.exercises ?? [], [workout]);
  const activeExercise = resolveActiveExercise(exercises, activeExerciseId);
  const tracking = useQuery({ queryKey: ["tracking", workoutId], enabled: extendedTracking,
    queryFn: () => apiFetch<TrackingPayload>(`/api/tracking/workouts/${workoutId}`) });
  const totals = useMemo(() => {
    const total = calculateSessionTotals(exercises);
    if (!extendedTracking || !tracking.data) return total;
    return { ...total, sets: total.sets + tracking.data.timedSets.length,
      workingSets: total.workingSets + tracking.data.timedSets.filter((entry) => entry.setType === "working").length,
      timeExercises: new Set(tracking.data.timedSets.map((entry) => entry.exerciseId)).size,
      cardioEntries: tracking.data.cardioEntries.length };
  }, [exercises, extendedTracking, tracking.data]);

  // While logging, remember the open exercise for this browser session, so
  // leaving for the Progress shortcut (or a reload) comes back to it. A
  // finished workout always opens on its summary.
  const viewRestored = useRef(false);
  useEffect(() => {
    if (!workout || viewRestored.current) return;
    viewRestored.current = true;
    try {
      const saved = JSON.parse(globalThis.sessionStorage.getItem(`gymtrack.session-view.${workoutId}`) ?? "null") as { exerciseId?: unknown; mode?: unknown } | null;
      if (workout.isOpen && saved && saved.mode === "sets" && workout.exercises.some((item) => item.id === saved.exerciseId)) {
        setActiveExerciseId(saved.exerciseId as string);
        setSessionMode("sets");
      }
    } catch {
      // Storage blocked or corrupt: start on the list.
    }
  }, [workout, workoutId]);
  useEffect(() => {
    if (!viewRestored.current) return;
    try {
      globalThis.sessionStorage.setItem(`gymtrack.session-view.${workoutId}`, JSON.stringify({ exerciseId: activeExerciseId, mode: sessionMode }));
    } catch {
      // Not critical.
    }
  }, [activeExerciseId, sessionMode, workoutId]);
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
      if (lastAdded) {
        setFollowActive(true);
        setActiveExerciseId(lastAdded.id);
      }
      closeEditors();
      setSheetOpen(false);
      setSessionMode("sets");
      setStatus(`${added.length} ${added.length === 1 ? "exercise" : "exercises"} added.`);
      exerciseMutationIds.current.clear();
      return true;
    } catch (caught) {
      setActionError(errorMessage(caught, "Couldn't add the exercise. Check your connection and try again."));
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
      { onError: (caught) => setActionError(errorMessage(caught, "Couldn't save the new order. Check your connection and try again.")) }
    );
  }

  if (workoutQuery.isLoading) return <SessionSkeleton />;
  if (workoutQuery.isError || !workout) return <SessionError error={workoutQuery.error} retry={() => void workoutQuery.refetch()} />;

  const isOpen = workout.isOpen;

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <SessionHeader
        focusName={focusName}
        isOpen={isOpen}
        isRenaming={workoutMutations.updateWorkout.isPending}
        onDelete={() => setConfirmDelete(true)}
        onRename={(title) => workoutMutations.updateWorkout.mutate(
          { workoutId: workout.id, input: { title } },
          { onError: (caught) => setActionError(errorMessage(caught, "Couldn't rename the workout. Check your connection and try again.")) }
        )}
        startedAt={workout.startedAt}
        title={workout.title}
      />

      <main className={`mx-auto grid w-full flex-1 content-start gap-6 overflow-x-clip px-4 pt-4 ${isOpen ? "max-w-5xl pb-6 lg:grid-cols-[minmax(0,1fr)_17rem]" : "max-w-3xl pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"}`}>
        <div className="min-w-0 space-y-6">
          {actionError ? <ErrorState message={actionError} title="Something went wrong" /> : null}
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
                followActive={followActive}
                isReordering={mutations.reorderExercises.isPending}
                onAdd={() => setSheetOpen(true)}
                onReorder={reorderExercises}
                onSelect={(id) => {
                  setFollowActive(true);
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
                  onSaveSet={() => { void logging.saveSet().then((saved) => { if (saved) void mark("logEditSet"); }); }}
                  savedFlash={null}
                  workoutEndedAt={workout.endedAt}
                />
              </>
            )}
          </div>

          {extendedTracking ? <WorkoutTracking workoutId={workoutId} /> : null}
          {!isOpen ? <SessionCompletionFooter workout={workout} /> : null}
        </div>

        {isOpen ? <SessionStats exercises={exercises.length + (totals.timeExercises ?? 0)} totals={totals} /> : null}
      </main>

      {isOpen ? (
        <SessionBottomBar
          isEnding={workoutMutations.endWorkout.isPending}
          onEnd={() => {
            workoutMutations.endWorkout.mutate(workout.id, {
              onSuccess: () => {
                clearWorkoutSetDrafts(userId, workoutId);
                logging.setRestTimer(null);
              },
              onError: (caught) => setActionError(errorMessage(caught, "Couldn't finish the workout. Check your connection and try again."))
            });
          }}
        >
          {logging.restTimer ? (
            <RestTimer
              onAdjust={(seconds) => logging.setRestTimer((current) => current ? { ...current, seconds: Math.max(0, current.seconds + seconds) } : null)}
              onDismiss={() => logging.setRestTimer(null)}
              seconds={logging.restTimer.seconds}
              startedAt={logging.restTimer.startedAt}
            />
          ) : null}
        </SessionBottomBar>
      ) : null}

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
        confirmLabel={isOpen ? "Discard workout" : "Delete workout"}
        isOpen={confirmDelete}
        isPending={workoutMutations.deleteWorkout.isPending}
        message={isOpen ? "The workout and every set in it are removed. This can't be undone." : "It's removed from your history, Progress and Volume. This can't be undone."}
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
            setActionError(errorMessage(caught, isOpen ? "Couldn't discard the workout. Check your connection and try again." : "Couldn't delete the workout. Check your connection and try again."));
          }
        }}
        pendingLabel={isOpen ? "Discarding…" : "Deleting…"}
        title={isOpen ? "Discard this workout?" : "Delete this workout?"}
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
