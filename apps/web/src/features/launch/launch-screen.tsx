"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { EmptyState, ErrorState, HudButton, Panel, Skeleton } from "../../shared/ui/ui";
import { apiFetch, errorMessage } from "../../shared/api/client";
import {
  useTemplateMutations,
  useTemplates,
  useWorkoutDetails,
  useWorkouts
} from "../../shared/api/hooks";
import type { WorkoutDetail, WorkoutTemplate } from "../../shared/api/types";
import { cockpitLabel, formatDuration, shortDate } from "../../shared/format";
import { IconBolt, IconPlus } from "../shell/icons";

export function LaunchScreen(): ReactNode {
  const router = useRouter();
  const workouts = useWorkouts(20);
  const templates = useTemplates();
  const templateMutations = useTemplateMutations();
  const [pendingChoice, setPendingChoice] = useState<string | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const items = useMemo(() => workouts.data?.items ?? [], [workouts.data]);
  const activeWorkout = items.find((workout) => workout.isOpen) ?? null;
  const activeDetails = useWorkoutDetails(activeWorkout ? [activeWorkout.id] : []);

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
      setLaunchError(errorMessage(caught, "The workout could not be started."));
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
      setLaunchError(errorMessage(caught, "The template workout could not be started."));
      await workouts.refetch();
      setPendingChoice(null);
    }
  }

  if (workouts.isLoading) {
    return <LaunchSkeleton />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 lg:p-6">
      <header>
        <p className="label-caps text-outline">WORKOUT_LAUNCH</p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-fg">
          Start a workout
        </h1>
        <p className="mt-1 text-sm text-fg-muted">Choose the fastest setup for today.</p>
      </header>

      {activeWorkout ? (
        <ResumeWorkout
          detail={activeDetails[activeWorkout.id]}
          href={`/workouts/${activeWorkout.id}`}
          startedAt={activeWorkout.startedAt}
          title={activeWorkout.title ?? activeWorkout.workoutType}
        />
      ) : (
        <>
          <Panel accent="cyan" className="glass-cyan" eyebrow="START_FROM_SCRATCH">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-display text-base font-bold text-fg">Start from scratch</p>
                <p className="mt-1 text-xs leading-relaxed text-fg-muted">
                  Open an untitled workout and add exercises as you train.
                </p>
              </div>
              <HudButton
                disabled={pendingChoice !== null}
                onClick={() => void startFromScratch()}
                size="lg"
              >
                <IconPlus /> {pendingChoice === "scratch" ? "STARTING…" : "START"}
              </HudButton>
            </div>
          </Panel>

          <TemplateChoice
            error={templates.error}
            isLoading={templates.isLoading}
            onRetry={() => void templates.refetch()}
            onStart={(templateId) => void startFromTemplate(templateId)}
            pendingChoice={pendingChoice}
            templates={templates.data ?? []}
          />
        </>
      )}

      {launchError ? <ErrorState message={launchError} title="LAUNCH_ERROR" /> : null}
    </div>
  );
}

function ResumeWorkout({
  detail,
  href,
  startedAt,
  title
}: {
  detail: WorkoutDetail | undefined;
  href: string;
  startedAt: string;
  title: string | null;
}): ReactNode {
  return (
    <Panel accent="green" className="glass-cyan" eyebrow="WORKOUT_IN_PROGRESS">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-bold text-fg">
            {title ? cockpitLabel(title) : `Workout ${shortDate(startedAt)}`}
          </p>
          <p className="text-xs text-outline">
            {formatDuration(startedAt, null)} elapsed · {detail?.exercises.length ?? 0} exercises
          </p>
        </div>
        <Link href={href}>
          <HudButton size="lg" variant="success">
            <IconBolt /> Resume workout
          </HudButton>
        </Link>
      </div>
    </Panel>
  );
}

function TemplateChoice({
  error,
  isLoading,
  onRetry,
  onStart,
  pendingChoice,
  templates
}: {
  error: Error | null;
  isLoading: boolean;
  onRetry: () => void;
  onStart: (templateId: string) => void;
  pendingChoice: string | null;
  templates: WorkoutTemplate[];
}): ReactNode {
  return (
    <Panel
      accent="lavender"
      eyebrow="USE_WORKOUT_TEMPLATE"
      right={<Link className="label-caps text-cyan-dim" href="/workouts/templates">View templates →</Link>}
    >
      {isLoading ? (
        <div className="space-y-2"><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
      ) : error ? (
        <ErrorState message={errorMessage(error, "Templates could not be loaded.")} retry={onRetry} />
      ) : templates.length === 0 ? (
        <EmptyState
          action={<Link className="label-caps text-cyan-dim" href="/workouts/templates">Create a template →</Link>}
          message="Save a repeatable exercise list to start it in one tap."
          title="NO_TEMPLATES"
        />
      ) : (
        <ul className="space-y-2">
          {templates.map((template) => (
            <li
              className="flex min-h-16 items-center justify-between gap-3 rounded-lg border border-outline-dim/50 bg-surface-low/30 p-3"
              key={template.id}
            >
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-bold text-fg">{template.name}</p>
                <p className="mt-0.5 truncate text-xs text-outline">
                  {template.exercises.length} exercises · {template.exercises.slice(0, 3).map((entry) => entry.exercise.name).join(" · ")}
                </p>
              </div>
              <HudButton
                disabled={pendingChoice !== null}
                onClick={() => onStart(template.id)}
                variant="outline"
              >
                {pendingChoice === template.id ? "STARTING…" : "USE"}
              </HudButton>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function LaunchSkeleton(): ReactNode {
  return <div className="mx-auto max-w-3xl space-y-4 p-4 lg:p-6"><Skeleton className="h-16" /><Skeleton className="h-28" /><Skeleton className="h-48" /></div>;
}
