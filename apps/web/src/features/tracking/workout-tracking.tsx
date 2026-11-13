"use client";

import { useId, useState, type ReactNode } from "react";
import { Button } from "../../shared/ui/button";
import { Sheet } from "../../shared/ui/sheet";
import { ConfirmDialog } from "../../shared/ui/confirm-dialog";
import { ErrorState, Skeleton } from "../../shared/ui/ui";
import { errorMessage } from "../../shared/api/client";
import { useTracking } from "./use-tracking";
import { TimedSetForm } from "./timed-set-form";
import { TimeExerciseCreator } from "./time-exercise-creator";
import { CardioForm } from "./cardio-form";
import { paceLabel, type TimedEntry, type CardioEntry } from "./tracking-types";

type Editor = { kind: "timed-sets"; entry?: TimedEntry } | { kind: "cardio"; entry?: CardioEntry };
export function WorkoutTracking({ workoutId }: { workoutId: string }): ReactNode {
  const tracking = useTracking(workoutId);
  const [creatingPending, setCreatingPending] = useState(false);
  const [creatingExercise, setCreatingExercise] = useState(false);
  const [preferredExercise, setPreferredExercise] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deleting, setDeleting] = useState<Editor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const open = (next: Editor): void => { tracking.abandonCreate(); setError(null); setEditor(next); };
  const catalog = [...(tracking.catalog.data?.items ?? [])].sort((left, right) => Number(right.id === preferredExercise) - Number(left.id === preferredExercise));
  return <section className="space-y-3" aria-label="Time sets and cardio">
    <h2 className="text-title-3 text-text">Time and cardio</h2>
    {tracking.entries.isLoading ? <Skeleton className="h-24 rounded-[var(--radius-card)]" /> : tracking.entries.isError ?
      <ErrorState message="Couldn't load time sets and cardio." retry={() => void tracking.entries.refetch()} /> : <>
      <div className="divide-y divide-line rounded-[var(--radius-card)] bg-surface">
        {tracking.entries.data?.timedSets.map((entry) => <div className="flex items-center gap-2 px-4 py-2" key={entry.id}>
          <button className="min-h-11 min-w-0 flex-1 break-words text-left text-body text-text" onClick={() => open({ kind: "timed-sets", entry })} type="button">
            {entry.exerciseName}<span className="num block text-subhead text-text-secondary">{entry.durationSeconds} s{entry.addedWeightKg !== null ? ` + ${entry.addedWeightKg} kg` : ""}{entry.setType === "warmup" ? " · Warmup" : ""}</span>
          </button><Button onClick={() => setDeleting({ kind: "timed-sets", entry })} size="compact" variant="plain">Delete<span className="sr-only"> {entry.exerciseName} time set</span></Button>
        </div>)}
        {tracking.entries.data?.cardioEntries.map((entry) => <div className="flex items-center gap-2 px-4 py-2" key={entry.id}>
          <button className="min-h-11 min-w-0 flex-1 break-words text-left text-body text-text" onClick={() => open({ kind: "cardio", entry })} type="button">
            {entry.activity}<span className="num block text-subhead text-text-secondary">{entry.durationSeconds} s{entry.distanceMetres ? ` / ${Number(entry.distanceMetres) / 1000} km` : ""}{paceLabel(entry.durationSeconds, entry.distanceMetres) ? ` (${paceLabel(entry.durationSeconds, entry.distanceMetres)})` : ""}</span>
            {entry.averageHeartRate ? <span className="block text-footnote text-text-secondary">Average {entry.averageHeartRate} bpm</span> : null}
          </button><Button onClick={() => setDeleting({ kind: "cardio", entry })} size="compact" variant="plain">Delete<span className="sr-only"> {entry.activity} entry</span></Button>
        </div>)}
        {!tracking.entries.data?.timedSets.length && !tracking.entries.data?.cardioEntries.length ? <p className="p-4 text-body text-text-secondary">No time sets or cardio logged in this workout.</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={!catalog.length} onClick={() => open({ kind: "timed-sets" })} variant="secondary">Add time set</Button>
        <Button onClick={() => { setError(null); setCreatingExercise(true); }} variant="plain">Create time exercise</Button>
        <Button onClick={() => open({ kind: "cardio" })} variant="secondary">Add cardio</Button>
      </div>
    </>}
    {tracking.catalog.isError ? <p role="status" className="text-footnote text-text-secondary">Time exercises could not be loaded. <button className="min-h-11 text-accent" onClick={() => void tracking.catalog.refetch()} type="button">Retry</button></p> : null}
    {error && !editor ? <p className="text-body text-danger" role="alert">{error}</p> : null}
    <Sheet closeOnScrim={false} closeOnEscape={!tracking.save.isPending && !creatingPending} isOpen={editor !== null || creatingExercise} onClose={() => { if (!tracking.save.isPending && !creatingPending) { tracking.abandonCreate(); setEditor(null); setCreatingExercise(false); } }} labelledBy={titleId}>
      <h2 className="mb-4 text-title-3 text-text" id={titleId}>{creatingExercise ? "Create time exercise" : editor?.kind === "timed-sets" ? "Time set" : "Cardio"}</h2>
      {error ? <p className="mb-3 text-body text-danger" role="alert">{error} Your draft is kept. To use newer values, close this sheet and reopen the entry.</p> : null}
      {creatingExercise ? <TimeExerciseCreator onPendingChange={setCreatingPending} onCancel={() => setCreatingExercise(false)} onCreated={async (id) => {
        await tracking.catalog.refetch(); setPreferredExercise(id); setCreatingExercise(false); setEditor({ kind: "timed-sets" });
      }} /> : null}
      {editor?.kind === "timed-sets" ? <TimedSetForm catalog={catalog} entry={editor.entry} key={editor.entry?.id ?? "new-time"} pending={tracking.save.isPending} onSave={async (values) => {
        try { await tracking.save.mutateAsync({ kind: "timed-sets", values, entry: editor.entry }); setEditor(null); setError(null); }
        catch (caught) { setError(errorMessage(caught, "Couldn't save the time set.")); }
      }} /> : editor ? <CardioForm entry={editor.entry} key={editor.entry?.id ?? "new-cardio"} pending={tracking.save.isPending} onSave={async (values) => {
        try { await tracking.save.mutateAsync({ kind: "cardio", values, entry: editor.entry }); setEditor(null); setError(null); }
        catch (caught) { setError(errorMessage(caught, "Couldn't save cardio.")); }
      }} /> : null}
      {!creatingExercise ? <Button className="mt-3" disabled={tracking.save.isPending} onClick={() => { tracking.abandonCreate(); setEditor(null); }} variant="plain">Cancel</Button> : null}
    </Sheet>
    <ConfirmDialog confirmLabel="Delete entry" isOpen={deleting !== null} isPending={tracking.remove.isPending} message="The entry is removed from this workout and its progress." onCancel={() => setDeleting(null)} onConfirm={async () => {
      if (!deleting?.entry) return;
      try { await tracking.remove.mutateAsync({ kind: deleting.kind, entry: deleting.entry }); setDeleting(null); }
      catch (caught) { setError(errorMessage(caught, "Couldn't delete this entry.")); setDeleting(null); }
    }} title="Delete this entry?" />
  </section>;
}
