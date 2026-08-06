"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { ErrorState, HudButton, Panel, Skeleton } from "../../shared/ui/ui";
import { errorMessage } from "../../shared/api/client";
import { useTemplateMutations, useTemplates } from "../../shared/api/hooks";
import type { WorkoutDetail } from "../../shared/api/types";

export function CompletionTemplateActions({ workout }: { workout: WorkoutDetail }): ReactNode {
  const templates = useTemplates();
  const mutations = useTemplateMutations();
  const [mode, setMode] = useState<"idle" | "new" | "kept" | "saved">("idle");
  const [name, setName] = useState(workout.title ? `${workout.title} Template` : "Workout Template");
  const [error, setError] = useState<string | null>(null);
  const source = useMemo(() => (templates.data ?? []).find((template) => template.id === workout.sourceTemplateId) ?? null, [templates.data, workout.sourceTemplateId]);
  const workoutIds = workout.exercises.map((entry) => entry.exercise.id);
  const sourceIds = source?.exercises.map((entry) => entry.exercise.id) ?? [];
  const changed = source !== null && !sameOrder(workoutIds, sourceIds);

  async function saveNew(): Promise<void> {
    if (!name.trim()) {
      setError("Template name is required.");
      return;
    }
    setError(null);
    try {
      await mutations.createFromWorkout.mutateAsync({ workoutId: workout.id, name: name.trim() });
      setMode("saved");
    } catch (caught) {
      setError(errorMessage(caught, "The template could not be created."));
    }
  }

  async function updateSource(): Promise<void> {
    if (!source) return;
    setError(null);
    try {
      await mutations.updateFromWorkout.mutateAsync({ templateId: source.id, workoutId: workout.id });
      setMode("saved");
    } catch (caught) {
      setError(errorMessage(caught, "The source template could not be updated."));
    }
  }

  if (templates.isLoading) return <Skeleton className="h-28" />;
  if (templates.isError) return <ErrorState message={errorMessage(templates.error, "Template options could not be loaded.")} retry={() => void templates.refetch()} />;
  if (mode === "saved") return <Panel accent="green" eyebrow="TEMPLATE_SAVED"><p className="text-xs text-fg-muted">The ordered exercise structure was saved without sets or performance data.</p><Link className="label-caps mt-3 inline-block text-green" href="/workouts/templates">VIEW_TEMPLATES →</Link></Panel>;
  if (mode === "kept") return <Panel accent="lavender" eyebrow="TEMPLATE_UNCHANGED"><p className="text-xs text-fg-muted">The completed session is saved and the source template was not changed.</p></Panel>;

  return <Panel accent={changed ? "lavender" : "cyan"} eyebrow={changed ? "TEMPLATE_STRUCTURE_CHANGED" : "SAVE_STRUCTURE"}>
    {changed ? <><p className="text-xs text-fg-muted">This session’s exercise IDs or order differ from <strong className="text-fg">{source?.name}</strong>. Choose what happens to the reusable structure.</p><div className="mt-3 flex flex-wrap gap-2"><HudButton onClick={() => setMode("kept")} size="sm" variant="ghost">KEEP_TEMPLATE_UNCHANGED</HudButton><HudButton disabled={mutations.updateFromWorkout.isPending} onClick={() => void updateSource()} size="sm" variant="outline">{mutations.updateFromWorkout.isPending ? "UPDATING…" : "UPDATE_EXISTING_TEMPLATE"}</HudButton><HudButton onClick={() => { setName(`${source?.name ?? "Workout"} Copy`); setMode("new"); }} size="sm">SAVE_AS_NEW_TEMPLATE</HudButton></div></> : <><p className="text-xs text-fg-muted">Save this session’s ordered exercises as a reusable template. Sets, weights, reps, and RIR are excluded.</p><HudButton className="mt-3" onClick={() => setMode("new")} size="sm" variant="outline">SAVE_WORKOUT_STRUCTURE_AS_TEMPLATE</HudButton></>}
    {mode === "new" ? <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input aria-label="Template name" className="min-h-11 flex-1 rounded border border-outline-dim bg-surface-low px-3 font-mono text-sm text-fg focus:border-cyan focus:outline-none" maxLength={120} onChange={(event) => setName(event.currentTarget.value)} value={name} /><HudButton disabled={mutations.createFromWorkout.isPending} onClick={() => void saveNew()}>{mutations.createFromWorkout.isPending ? "SAVING…" : "CREATE_TEMPLATE"}</HudButton></div> : null}
    {error ? <p className="mt-2 text-[11px] text-red" role="alert">{error}</p> : null}
  </Panel>;
}

function sameOrder(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}
