"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "../../shared/ui/button";
import { ErrorState, Skeleton } from "../../shared/ui/ui";
import { errorMessage } from "../../shared/api/client";
import { useTemplateMutations, useTemplates } from "../../shared/api/hooks";
import type { WorkoutDetail } from "../../shared/api/types";

export function CompletionTemplateActions({ workout }: { workout: WorkoutDetail }): ReactNode {
  const templates = useTemplates();
  const mutations = useTemplateMutations();
  const [mode, setMode] = useState<"idle" | "new" | "kept" | "saved">("idle");
  const [name, setName] = useState(workout.title ? `${workout.title} template` : "Workout template");
  const [error, setError] = useState<string | null>(null);
  const source = useMemo(() => (templates.data ?? []).find((template) => template.id === workout.sourceTemplateId) ?? null, [templates.data, workout.sourceTemplateId]);
  const workoutIds = workout.exercises.map((entry) => entry.exercise.id);
  const sourceIds = source?.exercises.map((entry) => entry.exercise.id) ?? [];
  const changed = source !== null && !sameOrder(workoutIds, sourceIds);
  const formRef = useRef<HTMLDivElement | null>(null);

  // The name form opens below the fold at the end of the page: bring it up
  // so its Save button isn't hidden under the bottom edge.
  useEffect(() => {
    if (mode !== "new") return;
    const reduce = typeof globalThis.matchMedia === "function" && globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
    formRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "end" });
  }, [mode]);

  async function saveNew(): Promise<void> {
    if (!name.trim()) {
      setError("Enter a name for the template.");
      return;
    }
    setError(null);
    try {
      await mutations.createFromWorkout.mutateAsync({ workoutId: workout.id, name: name.trim() });
      setMode("saved");
    } catch (caught) {
      setError(errorMessage(caught, "Couldn't save the template. Check your connection and try again."));
    }
  }

  async function updateSource(): Promise<void> {
    if (!source) return;
    setError(null);
    try {
      await mutations.updateFromWorkout.mutateAsync({ templateId: source.id, workoutId: workout.id });
      setMode("saved");
    } catch (caught) {
      setError(errorMessage(caught, "Couldn't update the template. Check your connection and try again."));
    }
  }

  if (templates.isLoading) return <Skeleton className="h-12" />;
  if (templates.isError) return <ErrorState message={errorMessage(templates.error, "Couldn't load your templates.")} retry={() => void templates.refetch()} />;
  if (mode === "saved") {
    return (
      <div className="rounded-[var(--radius-card)] bg-surface p-4">
        <p className="text-body text-text">Template saved.</p>
        <p className="mt-1 text-subhead text-text-secondary">It keeps the exercises and their order, not the sets.</p>
        <Link className="mt-2 inline-flex min-h-11 items-center text-body text-accent" href="/workouts/templates">View templates</Link>
      </div>
    );
  }
  if (mode === "kept") return <p className="rounded-[var(--radius-card)] bg-surface p-4 text-body text-text-secondary">{source?.name ?? "The template"} stays as it was.</p>;

  return (
    <div>
      {changed ? (
        <div className="rounded-[var(--radius-card)] bg-surface p-4">
          <p className="text-body text-text">You changed the exercises from {source?.name}.</p>
          <p className="mt-1 text-subhead text-text-secondary">Update the template to match this workout, save a new one, or keep it as it was.</p>
          <div className="mt-3 grid gap-2">
            <Button disabled={mutations.updateFromWorkout.isPending} onClick={() => void updateSource()} variant="secondary">
              {mutations.updateFromWorkout.isPending ? "Updating…" : `Update ${source?.name ?? "template"}`}
            </Button>
            <Button onClick={() => { setName(`${source?.name ?? "Workout"} copy`); setMode("new"); }} variant="secondary">Save as new template</Button>
            <Button onClick={() => setMode("kept")} variant="plain">Keep template as it was</Button>
          </div>
        </div>
      ) : mode !== "new" ? (
        <Button className="w-full" onClick={() => setMode("new")}>Save as template</Button>
      ) : null}
      {mode === "new" ? (
        <div className={`scroll-mb-[calc(env(safe-area-inset-bottom)+1.5rem)] rounded-[var(--radius-card)] bg-surface p-4 ${changed ? "mt-3" : ""}`} ref={formRef}>
          <label className="block">
            <span className="text-subhead text-text-secondary">Template name</span>
            <input className="mt-1.5 min-h-[3.125rem] w-full rounded-[var(--radius-control)] border border-control-line bg-surface-raised px-3 text-body text-text" maxLength={120} onChange={(event) => setName(event.currentTarget.value)} value={name} />
          </label>
          <p className="mt-1.5 text-footnote text-text-secondary">Keeps the exercises and their order, not the sets.</p>
          <Button className="mt-3 w-full" disabled={mutations.createFromWorkout.isPending} onClick={() => void saveNew()}>
            {mutations.createFromWorkout.isPending ? "Saving…" : "Save template"}
          </Button>
        </div>
      ) : null}
      {error ? <p className="mt-2 text-subhead text-danger" role="alert">{error}</p> : null}
    </div>
  );
}

function sameOrder(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}
