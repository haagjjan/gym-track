"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { Button, buttonClass } from "../../shared/ui/button";
import { ErrorState, Skeleton } from "../../shared/ui/ui";
import { apiFetch, errorMessage } from "../../shared/api/client";
import {
  useTemplateMutations,
  useTemplates,
  useWorkouts
} from "../../shared/api/hooks";
import type { WorkoutDetail, WorkoutTemplate } from "../../shared/api/types";
import { formatDayTime } from "../../shared/format";
import { IconForward } from "../../shared/ui/icons";

export function LaunchScreen(): ReactNode {
  const router = useRouter();
  const workouts = useWorkouts(20);
  const templates = useTemplates();
  const templateMutations = useTemplateMutations();
  const [pendingChoice, setPendingChoice] = useState<string | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const items = useMemo(() => workouts.data?.items ?? [], [workouts.data]);
  const activeWorkout = items.find((workout) => workout.isOpen) ?? null;

  async function startFromScratch(): Promise<void> {
    setPendingChoice("scratch");
    setLaunchError(null);

    try {
      const payload = await apiFetch<{ workout: WorkoutDetail }>("/api/workouts", {
        method: "POST",
        body: {}
      });
      router.push(`/workouts/${payload.workout.id}?focusName=1`);
    } catch (caught) {
      setLaunchError(errorMessage(caught, "Couldn't start the workout. Check your connection and try again."));
      await workouts.refetch();
      setPendingChoice(null);
    }
  }

  async function startFromTemplate(templateId: string): Promise<void> {
    setPendingChoice(templateId);
    setLaunchError(null);

    try {
      const result = await templateMutations.start.mutateAsync({ templateId });
      router.push(`/workouts/${result.workoutId}?focusName=1`);
    } catch (caught) {
      setLaunchError(errorMessage(caught, "Couldn't start the workout from this template. Check your connection and try again."));
      await workouts.refetch();
      setPendingChoice(null);
    }
  }

  if (workouts.isLoading) {
    return <LaunchSkeleton />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pb-6 pt-4 lg:px-6">
      <h1 className="text-large-title text-text">Workout</h1>

      {activeWorkout ? (
        <ResumeWorkout
          href={`/workouts/${activeWorkout.id}`}
          startedAt={activeWorkout.startedAt}
          title={activeWorkout.title ?? activeWorkout.workoutType}
        />
      ) : null}

      <WorkoutLaunchChoices error={templates.error} hasOpenWorkout={activeWorkout !== null} isLoading={templates.isLoading} onRetry={() => void templates.refetch()}
        onScratch={() => void startFromScratch()} onStart={(id) => void startFromTemplate(id)} pendingChoice={pendingChoice} templates={templates.data ?? []} />

      {launchError ? <ErrorState message={launchError} title="Couldn't start the workout" /> : null}
    </div>
  );
}

function ResumeWorkout({
  href,
  startedAt,
  title
}: {
  href: string;
  startedAt: string;
  title: string | null;
}): ReactNode {
  return (
    <section aria-label="Workout in progress" className="rounded-[var(--radius-card)] bg-surface p-4">
      <p className="truncate text-title-3 text-text">{title || "Workout"}</p>
      <p className="mt-1 text-subhead text-text-secondary">Started <span className="num">{formatDayTime(startedAt)}</span></p>
      <Link className={`${buttonClass("primary")} mt-4 w-full`} href={href}>Resume workout</Link>
    </section>
  );
}

function TemplateChoice({
  error,
  isLoading,
  onRetry,
  onStart,
  pendingChoice,
  templates,
  templatesHref
}: {
  error: Error | null;
  isLoading: boolean;
  onRetry: () => void;
  onStart: (templateId: string) => void;
  pendingChoice: string | null;
  templates: WorkoutTemplate[];
  templatesHref: string | null;
}): ReactNode {
  return (
    <section aria-labelledby="launch-templates-title">
      <h2 className="mb-2 text-title-2 text-text" id="launch-templates-title">Your templates</h2>
      {isLoading ? (
        <div className="space-y-2"><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
      ) : error ? (
        <ErrorState message={errorMessage(error, "Couldn't load your templates. Check your connection and try again.")} retry={onRetry} />
      ) : templates.length === 0 ? (
        <div className="rounded-[var(--radius-card)] bg-surface p-4">
          <p className="text-subhead text-text-secondary">Save a repeatable exercise list as a template to start it in one tap.</p>
          {templatesHref ? <Link className={`${buttonClass("secondary", "compact")} mt-3`} href={templatesHref}>Create a template</Link> : null}
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface">
          {templates.map((template) => (
            <li className="flex min-h-[3.75rem] items-center justify-between gap-3 px-4 py-2" key={template.id}>
              <div className="min-w-0">
                <p className="truncate text-headline text-text">{template.name}</p>
                <p className="mt-0.5 truncate text-subhead text-text-secondary">
                  <span className="num">{template.exercises.length}</span> {template.exercises.length === 1 ? "exercise" : "exercises"}
                  {template.exercises.length > 0 ? `, ${template.exercises.slice(0, 3).map((entry) => entry.exercise.name).join(", ")}` : ""}
                </p>
              </div>
              <Button
                aria-label={`Start ${template.name}`}
                className="shrink-0"
                disabled={pendingChoice !== null}
                onClick={() => onStart(template.id)}
                size="compact"
                variant="secondary"
              >
                {pendingChoice === template.id ? "Starting…" : "Start"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function NavRow({ href, label, detail }: { href: string; label: string; detail: string }): ReactNode {
  return (
    <li>
      <Link className="flex min-h-[3.75rem] items-center justify-between gap-3 px-4 py-2 active:bg-surface-raised" href={href}>
        <span className="min-w-0">
          <span className="block text-headline text-text">{label}</span>
          <span className="block truncate text-subhead text-text-secondary">{detail}</span>
        </span>
        <IconForward className="flex-none text-text-muted" />
      </Link>
    </li>
  );
}

function LaunchSkeleton(): ReactNode {
  return <div className="mx-auto max-w-3xl space-y-4 px-4 pb-6 pt-4 lg:px-6"><Skeleton className="h-11 w-48" /><Skeleton className="h-[3.125rem]" /><Skeleton className="h-48" /></div>;
}

export function WorkoutLaunchChoices({ error, hasOpenWorkout = false, isLoading, onRetry, onScratch, onStart, pendingChoice, templates, templatesHref = "/workouts/templates" }: {
  error: Error | null; hasOpenWorkout?: boolean; isLoading: boolean; onRetry: () => void; onScratch: () => void;
  onStart: (id: string) => void; pendingChoice: string | null; templates: WorkoutTemplate[]; templatesHref?: string | null;
}): ReactNode {
  return (
    <>
      <Button
        className="w-full"
        disabled={pendingChoice !== null}
        onClick={() => void onScratch()}
        variant={hasOpenWorkout ? "secondary" : "primary"}
      >
        {pendingChoice === "scratch" ? "Starting…" : "Start empty workout"}
      </Button>

      <TemplateChoice
        error={error}
        isLoading={isLoading}
        onRetry={onRetry}
        onStart={onStart}
        pendingChoice={pendingChoice}
        templates={templates}
        templatesHref={templatesHref}
      />

      {templatesHref ? (
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface">
          <NavRow detail="Create and edit your own" href={templatesHref} label="Templates" />
          <NavRow detail="Browse and add exercises" href="/workouts/exercises" label="Exercise library" />
        </ul>
      ) : null}
    </>
  );
}
