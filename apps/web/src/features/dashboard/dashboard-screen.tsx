"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { ErrorState, HudButton, Panel } from "../../shared/ui/ui";
import {
  useCompletedExercises,
  useExerciseSummary,
  useWeeklyVolume,
  useWorkouts
} from "../../shared/api/hooks";
import type { AuthUser } from "../auth/auth-types";
import type { ExerciseSummaryPayload } from "../../shared/api/types";
import { shortDate } from "../../shared/format";
import { IconBolt, IconChart, IconVolume } from "../shell/icons";
import type { SceneConnector } from "../avatar/avatar-stage";
import { BayAmbience } from "../avatar/bay-ambience";
import { useStartSession } from "../session/use-start-session";
import { ConnectorLayer, type ConnectorLink } from "./connector-layer";
import {
  AvatarFallback,
  BiometricRows,
  IdentityRows,
  LatestLogs,
  PerformanceRows,
  QuickLink,
  SessionRows,
  type PerformanceRowItem
} from "./dashboard-panels";
import { TiltCard } from "./tilt-card";
import { useDisplaySettings } from "./use-display-settings";
import { useFavoriteLifts } from "./use-favorite-lifts";

const AvatarStage = dynamic(
  () => import("../avatar/avatar-stage").then((module) => module.AvatarStage),
  { ssr: false, loading: () => <AvatarFallback label="Loading your figure" /> }
);

const connectorLinks: ConnectorLink[] = [
  { from: "card-identity", to: "body-head" },
  { from: "card-performance", to: "body-arm" },
  { from: "card-sessions", to: "body-chest" },
  { from: "card-biometrics", to: "body-legs" }
];

export function DashboardScreen({ user }: { user: AuthUser }): ReactNode {
  const stageRef = useRef<HTMLDivElement>(null);
  // Card side/height measurements the 3D connector beams anchor against.
  const [sceneConnectors, setSceneConnectors] = useState<SceneConnector[]>([]);
  const workouts = useWorkouts(8);
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

  // SYSTEM_CHARGE: weekly working sets vs a 48-set target drives the rim glow.
  const systemCharge = Math.max(12, Math.min(100, Math.round((weeklySets / 48) * 100)));

  // Cockpit display prefs (Settings): idle turntable spin is user-toggleable.
  const { settings: displaySettings } = useDisplaySettings();

  // The green PR pulse is intentionally NOT wired up: owner pulled it pending
  // a designed celebration effect (e.g. a purple hologram body-scan on workout
  // completion). The stage's pulseSignal machinery stays for that future use.

  const measureKey = `${workouts.isLoading}-${completedExercises.isLoading}-${summaries.length}-${completedSessions.length}`;

  return (
    <div className="hud-grid relative isolate min-h-full" ref={stageRef}>
      <BayAmbience />

      <ConnectorLayer
        containerRef={stageRef}
        links={connectorLinks}
        measureKey={measureKey}
        onSceneLinks={setSceneConnectors}
      />

      <div className="relative mx-auto grid max-w-7xl gap-4 p-4 lg:grid-cols-[280px_minmax(0,1fr)_320px] lg:gap-6 lg:p-6">
        {/* ===== Center: the avatar pillar (first in DOM on mobile). Bounded
              canvas — framing is tuned per container; BayAmbience continues the
              environment past its faded edges. ===== */}
        <div className="relative order-1 lg:order-2 lg:row-span-2">
          <div
            className="relative h-[36dvh] min-h-64 max-h-[380px] sm:h-[40dvh] sm:max-h-[440px] lg:h-[calc(100dvh-14rem)] lg:min-h-[480px] lg:max-h-none"
            data-connector-id="avatar-stage"
          >
            <AvatarStage
              autoSpin={displaySettings.autoSpin}
              connectors={sceneConnectors}
              readiness={systemCharge}
            />

            {activeWorkout ? (
              <p className="label-caps absolute left-1/2 top-1 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded border border-cyan/40 bg-void/80 px-3 py-1.5 text-cyan sm:top-3">
                <span aria-hidden className="status-dot animate-pulse-slow bg-cyan shadow-glow-cyan" />
                In progress · {shortDate(activeWorkout.startedAt)}
              </p>
            ) : null}
          </div>
          <HudButton
            className="mt-3 w-full lg:hidden"
            data-testid="mobile-session-cta"
            disabled={isStarting}
            onClick={() => void start()}
            variant="primary"
          >
            {isStarting ? "OPENING…" : activeWorkout ? "RESUME WORKOUT" : "START WORKOUT"}
          </HudButton>
        </div>

        {/* ===== Left column ===== */}
        <div className="order-2 space-y-4 lg:order-1">
          <TiltCard>
            <Panel accent="none" className="glass-cyan" data-connector-id="card-identity" eyebrow="Signed in as">
              <h1 className="min-w-0 break-words font-display text-2xl font-bold uppercase tracking-tight text-fg [overflow-wrap:anywhere]">
                {user.username}
              </h1>
              <IdentityRows />
            </Panel>
          </TiltCard>

          <TiltCard>
            <Panel
              accent="green"
              data-connector-id="card-performance"
              eyebrow="Personal bests"
              right={<IconBolt className="text-green-dim" />}
            >
              <PerformanceRows
                exercises={topExercises}
                hasPins={hasPins}
                isLoading={completedExercises.isLoading || summaryA.isLoading}
                summaries={summaries}
              />
            </Panel>
          </TiltCard>

          {startError ? <ErrorState message={startError} title="Could not start a workout" /> : null}
        </div>

        {/* ===== Right column ===== */}
        <div className="order-3 space-y-4">
          <TiltCard>
            <Panel accent="none" className="glass-cyan chamfer" data-connector-id="card-sessions" eyebrow="Recent workouts">
              <SessionRows isLoading={workouts.isLoading} sessions={completedSessions.slice(0, 3)} />
              <Link
                className="mt-2 block text-center text-[10px] uppercase tracking-[0.1em] text-outline transition-colors hover:text-cyan"
                href="/workout"
              >
                See all workouts →
              </Link>
            </Panel>
          </TiltCard>

          <nav aria-label="Analytics quick views" className="space-y-1">
            <QuickLink href="/progress" icon={<IconChart />} label="Progress" />
            <QuickLink href="/weekly-volume" icon={<IconVolume />} label="Muscle volume" />
          </nav>

          <TiltCard>
            <Panel accent="lavender" data-connector-id="card-biometrics" eyebrow="Body profile">
              <BiometricRows systemCharge={systemCharge} />
            </Panel>
          </TiltCard>
        </div>

        {/* ===== Bottom rail ===== */}
        <div className="order-4 hidden lg:col-span-3 lg:order-3 lg:block">
          <Panel accent="none" className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="label-caps text-outline">Latest workouts</p>
              <LatestLogs isLoading={workouts.isLoading} sessions={completedSessions.slice(0, 4)} />
            </div>
            <HudButton
              className="sm:w-56"
              disabled={isStarting}
              onClick={() => void start()}
              size="lg"
            >
              {activeWorkout ? "RESUME WORKOUT" : "START WORKOUT"}
            </HudButton>
          </Panel>
        </div>
      </div>
    </div>
  );
}
