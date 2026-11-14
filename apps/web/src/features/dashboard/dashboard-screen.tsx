"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { buttonClass, Button } from "../../shared/ui/button";
import { StatTile } from "../../shared/ui/stat-tile";
import { ErrorState } from "../../shared/ui/ui";
import {
  useCompletedExercises,
  useExerciseSummary,
  useWeeklyVolume,
  useWorkouts
} from "../../shared/api/hooks";
import type { AuthUser } from "../auth/auth-types";
import type { ExerciseSummaryPayload } from "../../shared/api/types";
import { formatDayTime, formatCompactNumber } from "../../shared/format";
import { useStartSession } from "../session/use-start-session";
import { HomeHeaderActions } from "../shell/home-header-actions";
import {
  AvatarFallback,
  PerformanceRows,
  SessionRows,
  type PerformanceRowItem
} from "./dashboard-panels";
import { useDisplaySettings } from "./use-display-settings";
import { useFavoriteLifts } from "./use-favorite-lifts";

const AvatarStage = dynamic(
  () => import("../avatar/avatar-stage").then((module) => module.AvatarStage),
  { ssr: false, loading: () => <AvatarFallback label="Loading your figure" /> }
);

export function DashboardScreen({ user }: { user: AuthUser }): ReactNode {
  // 20 is the page the shell already loads (shared cache), enough for a whole week.
  const workouts = useWorkouts(20);
  const completedExercises = useCompletedExercises();
  const weeklyVolume = useWeeklyVolume(7);
  const { start, isPending: isStarting, error: startError } = useStartSession();

  // Headline PBs: user-pinned favorite lifts (Settings) take priority. Without
  // pins, fall back to probing the four most-trained lifts and showing the
  // strongest three by estimated 1RM.
  const { favorites, isLoaded: favoritesLoaded } = useFavoriteLifts();
  const hasPins = favoritesLoaded && favorites.length > 0;
  const probedExercises = useMemo(
    () =>
      [...(completedExercises.data ?? [])]
        .sort((a, b) => b.totalSets - a.totalSets)
        .slice(0, 4),
    [completedExercises.data]
  );
  const slotIds: (string | null)[] = hasPins
    ? [favorites[0]?.id ?? null, favorites[1]?.id ?? null, favorites[2]?.id ?? null, null]
    : [
        probedExercises[0]?.id ?? null,
        probedExercises[1]?.id ?? null,
        probedExercises[2]?.id ?? null,
        probedExercises[3]?.id ?? null
      ];
  const summaryA = useExerciseSummary(slotIds[0] ?? null);
  const summaryB = useExerciseSummary(slotIds[1] ?? null);
  const summaryC = useExerciseSummary(slotIds[2] ?? null);
  const summaryD = useExerciseSummary(slotIds[3] ?? null);
  const summaries = useMemo(
    () =>
      [summaryA.data, summaryB.data, summaryC.data, summaryD.data].filter(
        (item): item is ExerciseSummaryPayload => Boolean(item)
      ),
    [summaryA.data, summaryB.data, summaryC.data, summaryD.data]
  );
  const topExercises = useMemo<PerformanceRowItem[]>(() => {
    if (hasPins) {
      return favorites.map((lift) => ({
        id: lift.id,
        name: lift.name,
        totalSets:
          completedExercises.data?.find((item) => item.id === lift.id)?.totalSets ?? 0
      }));
    }

    return [...probedExercises]
      .sort((a, b) => {
        const oneRm = (id: string): number =>
          Number(
            summaries.find((item) => item.exerciseId === id)?.bestTopSet
              ?.estimatedOneRepMaxKg ?? 0
          );

        return oneRm(b.id) - oneRm(a.id);
      })
      .slice(0, 3)
      .map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        totalSets: exercise.totalSets
      }));
  }, [completedExercises.data, favorites, hasPins, probedExercises, summaries]);

  const activeWorkout = workouts.data?.items.find((workout) => workout.isOpen) ?? null;
  const completedSessions =
    workouts.data?.items.filter((workout) => !workout.isOpen) ?? [];

  const weeklySets = useMemo(() => {
    const weeks = weeklyVolume.data?.weeks ?? [];
    const latest = weeks.reduce<(typeof weeks)[number] | null>(
      (latestWeek, week) =>
        !latestWeek || new Date(week.weekStart) > new Date(latestWeek.weekStart)
          ? week
          : latestWeek,
      null
    );

    return latest?.items.reduce((total, item) => total + item.workingSets, 0) ?? 0;
  }, [weeklyVolume.data]);

  // Weekly weighted muscle sets against a 48-set target drive the rim glow.
  const systemCharge = Math.max(12, Math.min(100, Math.round((weeklySets / 48) * 100)));

  // Cockpit display prefs (Settings): idle turntable spin is user-toggleable.
  const { settings: displaySettings } = useDisplaySettings();

  // The green PR pulse is intentionally NOT wired up: owner pulled it pending
  // a designed celebration effect (e.g. a purple hologram body-scan on workout
  // completion). The stage's pulseSignal machinery stays for that future use.

  // This week's totals come from the recent workouts already loaded (Monday
  // start, local time), so no extra request is needed.
  const week = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
    const inWeek = (workouts.data?.items ?? []).filter(
      (workout) => !workout.isOpen && new Date(workout.startedAt) >= weekStart
    );

    return {
      workouts: inWeek.length,
      sets: inWeek.reduce((total, workout) => total + workout.totalSets, 0),
      volumeKg: inWeek.reduce((total, workout) => total + Number(workout.tonnageKg || 0), 0)
    };
  }, [workouts.data]);

  const dateLabel = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <div className="mx-auto max-w-7xl px-4 pb-6 pt-2 lg:px-6">
      {/* Actions share the date row so a long username can't push them down or squeeze the greeting. */}
      <header className="pt-2">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 text-subhead text-text-secondary">{dateLabel}</p>
          <HomeHeaderActions user={user} />
        </div>
        <h1 className="line-clamp-2 text-large-title text-text [overflow-wrap:anywhere]" title={user.username}>
          Hi, {user.username}
        </h1>
      </header>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="space-y-6">
          {/* Desktop only: on phones the centre Workout tab starts or resumes (pulse or red dot). */}
          <section aria-labelledby="start-title" className="hidden rounded-[var(--radius-card)] bg-surface p-4 lg:block">
            {activeWorkout ? (
              <>
                <h2 className="text-headline text-text" id="start-title">Workout in progress</h2>
                <p className="mt-0.5 text-subhead text-text-secondary">Started {formatDayTime(activeWorkout.startedAt)}</p>
                <Button className="mt-4 w-full" disabled={isStarting} onClick={() => void start()}>
                  {isStarting ? "Opening…" : "Resume workout"}
                </Button>
              </>
            ) : (
              <>
                <h2 className="text-headline text-text" id="start-title">Ready to train?</h2>
                <p className="mt-0.5 text-subhead text-text-secondary">Pick a template or start from scratch.</p>
                <Link className={`${buttonClass("primary")} mt-4 w-full`} href="/workout">Start workout</Link>
              </>
            )}
            {startError ? <div className="mt-4"><ErrorState message="Check your connection and try again." title="Couldn't open the workout" /></div> : null}
          </section>

          <section aria-labelledby="week-title">
            <h2 className="mb-2 px-1 text-title-3 text-text" id="week-title">This week</h2>
            <div className="overflow-hidden rounded-[var(--radius-card)] bg-surface">
              <div className="home-stage relative isolate h-60 overflow-hidden">
                <div className="relative z-10 h-full">
                  <AvatarStage autoSpin={displaySettings.autoSpin} readiness={systemCharge} />
                </div>
              </div>
              <dl className="grid grid-cols-3 divide-x divide-line">
                <div className="px-4 py-3.5"><StatTile label="Workouts" value={week.workouts} /></div>
                <div className="px-4 py-3.5"><StatTile label="Sets" value={week.sets} /></div>
                <div className="px-4 py-3.5"><StatTile label="Volume" unit="kg" value={formatCompactNumber(week.volumeKg)} /></div>
              </dl>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section aria-labelledby="pr-title">
            <div className="mb-2 flex items-baseline justify-between px-1">
              <h2 className="text-title-3 text-text" id="pr-title">Personal bests</h2>
              <Link className="inline-flex min-h-11 items-center text-body text-accent" href="/settings">Edit</Link>
            </div>
            <PerformanceRows
              exercises={topExercises}
              isLoading={completedExercises.isLoading || summaryA.isLoading}
              summaries={summaries}
            />
          </section>

          <section aria-labelledby="recent-title">
            <div className="mb-2 flex items-baseline justify-between px-1">
              <h2 className="text-title-3 text-text" id="recent-title">Recent workouts</h2>
              <Link className="inline-flex min-h-11 items-center text-body text-accent" href="/workouts">See all</Link>
            </div>
            <SessionRows isLoading={workouts.isLoading} sessions={completedSessions.slice(0, 3)} />
          </section>
        </div>
      </div>
    </div>
  );
}
