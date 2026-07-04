"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { EmptyState, ErrorState, HudButton, Panel, Skeleton } from "../../components/ui";
import { apiFetch } from "../../shared/api/client";
import {
  useCompletedExercises,
  useExerciseSummary,
  useWeeklyVolume,
  useWorkouts
} from "../../shared/api/hooks";
import type { AuthUser } from "../auth/auth-types";
import type { ExerciseSummaryPayload, WorkoutSummary } from "../../shared/api/types";
import {
  cockpitLabel,
  formatDuration,
  formatKgValue,
  shortDate
} from "../../shared/format";
import { IconBolt, IconChart, IconChevronRight, IconVolume } from "../shell/icons";
import { useStartSession } from "../session/use-start-session";
import { ConnectorLayer, type ConnectorLink } from "./connector-layer";
import { TiltCard } from "./tilt-card";
import { useBiometrics } from "./use-biometrics";
import { useFavoriteLifts } from "./use-favorite-lifts";

interface PerformanceRowItem {
  id: string;
  name: string;
  totalSets: number;
}

const AvatarStage = dynamic(
  () => import("../avatar/avatar-stage").then((module) => module.AvatarStage),
  { ssr: false, loading: () => <AvatarFallback label="CALIBRATING_SCANNER" /> }
);

const connectorLinks: ConnectorLink[] = [
  { from: "card-identity", to: "body-head" },
  { from: "card-performance", to: "body-arm" },
  { from: "card-sessions", to: "body-chest" },
  { from: "card-biometrics", to: "body-legs" }
];

export function DashboardScreen({ user }: { user: AuthUser }): ReactNode {
  const stageRef = useRef<HTMLDivElement>(null);
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

  // Fire the PR pulse when a tracked lift's best top set landed in the last 24h.
  const [pulseSignal, setPulseSignal] = useState(0);
  const hasFreshPr = useMemo(
    () =>
      summaries.some((summary) => {
        const dateValue = summary.bestTopSet?.sessionDate;

        return dateValue
          ? Date.now() - new Date(dateValue).getTime() < 24 * 60 * 60 * 1000
          : false;
      }),
    [summaries]
  );

  useEffect(() => {
    if (hasFreshPr) {
      const timeout = window.setTimeout(() => setPulseSignal((value) => value + 1), 1200);

      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, [hasFreshPr]);

  const measureKey = `${workouts.isLoading}-${completedExercises.isLoading}-${summaries.length}-${completedSessions.length}`;

  return (
    <div className="hud-grid relative min-h-full" ref={stageRef}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(0,219,231,0.08),transparent_55%)]"
      />

      <ConnectorLayer containerRef={stageRef} links={connectorLinks} measureKey={measureKey} />

      {!user.emailVerified ? <VerifyEmailBanner /> : null}

      <div className="relative mx-auto grid max-w-7xl gap-4 p-4 lg:grid-cols-[280px_minmax(0,1fr)_320px] lg:gap-6 lg:p-6">
        {/* ===== Center: the avatar pillar (first in DOM on mobile) ===== */}
        <div className="relative order-1 lg:order-2 lg:row-span-2">
          <div className="relative h-[44dvh] min-h-72 lg:h-[calc(100dvh-14rem)] lg:min-h-[480px]">
            <AvatarStage pulseSignal={pulseSignal} readiness={systemCharge} />

            <BodyAnchor id="body-head" x={50} y={22} />
            <BodyAnchor id="body-arm" x={37} y={33} />
            <BodyAnchor id="body-chest" x={57} y={38} />
            <BodyAnchor id="body-legs" x={50} y={66} />

            <p className="label-caps absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap rounded border border-outline-dim/60 bg-void/60 px-3 py-1.5 text-outline backdrop-blur-sm">
              {activeWorkout ? (
                <span className="flex items-center gap-2 text-green">
                  <span aria-hidden className="status-dot animate-pulse-slow bg-green shadow-glow-green" />
                  ACTIVE_SESSION // {shortDate(activeWorkout.startedAt)}
                </span>
              ) : (
                <>SYSTEM_READY // CHARGE: {systemCharge}%</>
              )}
            </p>
          </div>
        </div>

        {/* ===== Left column ===== */}
        <div className="order-2 space-y-4 lg:order-1">
          <TiltCard>
            <Panel accent="cyan" className="glass-cyan" data-connector-id="card-identity" eyebrow="OPERATOR_ID">
              <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-cyan-bright">
                {user.username}
              </h1>
              <p className="label-caps mt-1 text-green-dim">SYSTEM ACTIVE // STATUS: OPTIMAL</p>
              <IdentityRows />
            </Panel>
          </TiltCard>

          <TiltCard>
            <Panel
              accent="cyan"
              data-connector-id="card-performance"
              eyebrow="PERFORMANCE_PB"
              right={<IconBolt className="text-cyan-dim" />}
            >
              <PerformanceRows
                exercises={topExercises}
                hasPins={hasPins}
                isLoading={completedExercises.isLoading || summaryA.isLoading}
                summaries={summaries}
              />
            </Panel>
          </TiltCard>

          {startError ? <ErrorState message={startError} title="LAUNCH_ERROR" /> : null}
        </div>

        {/* ===== Right column ===== */}
        <div className="order-3 space-y-4">
          <TiltCard>
            <Panel accent="cyan" className="glass-cyan chamfer" data-connector-id="card-sessions" eyebrow="PREVIOUS_SESSIONS">
              <SessionRows isLoading={workouts.isLoading} sessions={completedSessions.slice(0, 3)} />
              <HudButton
                className="mt-4 w-full"
                disabled={isStarting}
                onClick={() => void start()}
                size="lg"
                variant={activeWorkout ? "success" : "outline"}
              >
                {isStarting ? "OPENING…" : activeWorkout ? "RESUME_SESSION" : "START_SESSION"}
              </HudButton>
              <Link
                className="mt-2 block text-center text-[10px] uppercase tracking-[0.1em] text-outline transition-colors hover:text-cyan"
                href="/workout"
              >
                Launch options / clone a previous structure →
              </Link>
            </Panel>
          </TiltCard>

          <nav aria-label="Analytics quick views" className="space-y-1">
            <QuickLink href="/progress" icon={<IconChart />} label="PROGRESS_MENU_VIEW" />
            <QuickLink href="/weekly-volume" icon={<IconVolume />} label="VOLUME_MENU_VIEW" />
          </nav>

          <TiltCard>
            <Panel accent="lavender" data-connector-id="card-biometrics" eyebrow="BIOMETRIC_STATUS">
              <BiometricRows systemCharge={systemCharge} />
            </Panel>
          </TiltCard>
        </div>

        {/* ===== Bottom rail ===== */}
        <div className="order-4 lg:col-span-3 lg:order-3">
          <Panel accent="none" className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="label-caps text-outline">LATEST_LOGS</p>
              <LatestLogs isLoading={workouts.isLoading} sessions={completedSessions.slice(0, 4)} />
            </div>
            <HudButton
              className="sm:w-56"
              disabled={isStarting}
              onClick={() => void start()}
              size="lg"
            >
              {activeWorkout ? "RESUME_SESSION" : "INITIATE_SESSION"}
            </HudButton>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function VerifyEmailBanner(): ReactNode {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  async function resend(): Promise<void> {
    setState("sending");

    try {
      const result = await apiFetch<{ sent: boolean }>("/api/auth/resend-verification", {
        method: "POST",
        body: {}
      });

      setState(result.sent ? "sent" : "failed");
    } catch {
      setState("failed");
    }
  }

  return (
    <div className="relative z-20 mx-auto max-w-7xl px-4 pt-4 lg:px-6">
      <div className="flex flex-col gap-2 rounded-lg border border-lavender/40 bg-lavender/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-lavender">
          <span className="label-caps mr-2">EMAIL_UNVERIFIED</span>
          Confirm your email to secure account recovery. Check your inbox for the link.
        </p>
        <button
          className="label-caps cursor-pointer self-start whitespace-nowrap rounded border border-lavender/50 px-3 py-2 text-lavender transition-colors hover:bg-lavender/10 disabled:opacity-60 sm:self-auto"
          disabled={state === "sending" || state === "sent"}
          onClick={() => void resend()}
          type="button"
        >
          {state === "sent"
            ? "LINK_SENT ✓"
            : state === "sending"
              ? "SENDING…"
              : state === "failed"
                ? "RETRY_SEND"
                : "RESEND_LINK"}
        </button>
      </div>
    </div>
  );
}

function BodyAnchor({ id, x, y }: { id: string; x: number; y: number }): ReactNode {
  return (
    <span
      aria-hidden
      className="absolute size-px"
      data-connector-id={id}
      style={{ left: `${x}%`, top: `${y}%` }}
    />
  );
}

function AvatarFallback({ label }: { label: string }): ReactNode {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="label-caps animate-pulse-slow text-cyan-dim">{label}</p>
    </div>
  );
}

function IdentityRows(): ReactNode {
  const { biometrics, isLoaded } = useBiometrics();
  const rows: { label: string; value: string }[] = [
    { label: "Height", value: biometrics.heightCm ? `${biometrics.heightCm} cm` : "—" },
    { label: "BW", value: biometrics.weightKg ? `${biometrics.weightKg} kg` : "—" }
  ];

  if (!isLoaded) {
    return <Skeleton className="mt-3 h-10" />;
  }

  return (
    <dl className="mt-3 space-y-1.5">
      {rows.map((row) => (
        <div className="flex items-baseline justify-between gap-2" key={row.label}>
          <dt className="text-xs text-fg-muted">{row.label}</dt>
          <dd className="font-mono text-sm tracking-[0.05em] text-fg">{row.value}</dd>
        </div>
      ))}
      {!biometrics.heightCm && !biometrics.weightKg ? (
        <Link className="label-caps mt-1 inline-block text-cyan-dim hover:text-cyan" href="/settings">
          CONFIGURE_IN_SETTINGS →
        </Link>
      ) : null}
    </dl>
  );
}

function PerformanceRows({
  exercises,
  hasPins,
  isLoading,
  summaries
}: {
  exercises: PerformanceRowItem[];
  hasPins: boolean;
  isLoading: boolean;
  summaries: ExerciseSummaryPayload[];
}): ReactNode {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <EmptyState
        action={
          <Link className="label-caps text-cyan-dim hover:text-cyan" href="/settings">
            PIN_LIFTS_IN_SETTINGS →
          </Link>
        }
        message="Pin favorite lifts in Settings, or log working sets to derive them."
        title="NO_TRACKED_LIFTS"
      />
    );
  }

  return (
    <>
      <ul className="space-y-2.5">
        {exercises.map((exercise) => {
          const summary = summaries.find((item) => item.exerciseId === exercise.id);
          const topSet = summary?.bestTopSet;

          return (
            <li className="flex items-baseline justify-between gap-2" key={exercise.id}>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-fg">{exercise.name}</p>
                <p className="truncate text-[10px] uppercase tracking-[0.08em] text-outline">
                  {topSet
                    ? `${formatKgValue(topSet.weightKg)}kg × ${topSet.reps} // ${shortDate(topSet.sessionDate)}`
                    : exercise.totalSets > 0
                      ? `${exercise.totalSets} sets logged`
                      : "NO_DATA_YET"}
                </p>
              </div>
              <p className="whitespace-nowrap font-mono text-base font-medium tracking-[0.05em] text-cyan">
                {topSet ? `${formatKgValue(topSet.estimatedOneRepMaxKg)} KG` : "—"}
              </p>
            </li>
          );
        })}
      </ul>
      {!hasPins ? (
        <Link
          className="mt-2.5 block text-[10px] uppercase tracking-[0.08em] text-outline transition-colors hover:text-cyan"
          href="/settings"
        >
          Auto-derived — pin your own in Settings →
        </Link>
      ) : null}
    </>
  );
}

function SessionRows({
  isLoading,
  sessions
}: {
  isLoading: boolean;
  sessions: WorkoutSummary[];
}): ReactNode {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-11" />
        <Skeleton className="h-11" />
        <Skeleton className="h-11" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <EmptyState
        message="Completed sessions will stack up here for one-tap review."
        title="NO_SESSION_HISTORY"
      />
    );
  }

  return (
    <ul className="space-y-1.5">
      {sessions.map((session) => (
        <li key={session.id}>
          <Link
            className="flex min-h-11 items-center justify-between gap-2 rounded border border-cyan/20 bg-surface-low/50 px-3 py-2 transition-colors hover:border-cyan/60 hover:bg-surface-low"
            href={`/workouts/${session.id}`}
          >
            <span className="min-w-0">
              <span className="block truncate font-display text-xs font-bold uppercase tracking-[0.1em] text-fg">
                {sessionTitle(session)}
              </span>
              <span className="block text-[10px] uppercase tracking-[0.08em] text-outline">
                {`${shortDate(session.startedAt)} // ${session.totalSets} sets // ${formatDuration(session.startedAt, session.endedAt)}`}
              </span>
            </span>
            <IconChevronRight className="shrink-0 text-outline" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function QuickLink({
  href,
  icon,
  label
}: {
  href: string;
  icon: ReactNode;
  label: string;
}): ReactNode {
  return (
    <Link
      className="flex min-h-11 items-center gap-3 rounded px-3 text-fg-muted transition-colors hover:bg-surface-low hover:text-cyan"
      href={href}
    >
      <span aria-hidden className="flex text-cyan-dim">
        <IconChevronRight />
        <IconChevronRight className="-ml-2.5" />
      </span>
      {icon}
      <span className="label-caps">{label}</span>
    </Link>
  );
}

function BiometricRows({ systemCharge }: { systemCharge: number }): ReactNode {
  const { biometrics, isLoaded } = useBiometrics();

  if (!isLoaded) {
    return <Skeleton className="h-28" />;
  }

  const rows = [
    { label: "AGE", value: biometrics.age !== null ? String(biometrics.age) : "—", unit: "" },
    {
      label: "HEIGHT",
      value: biometrics.heightCm !== null ? String(biometrics.heightCm) : "—",
      unit: "CM"
    },
    {
      label: "WEIGHT",
      value: biometrics.weightKg !== null ? String(biometrics.weightKg) : "—",
      unit: "KG"
    },
    {
      label: "EST_BFP",
      value: biometrics.bodyFatPct !== null ? String(biometrics.bodyFatPct) : "—",
      unit: "%"
    }
  ];

  return (
    <div>
      <dl className="space-y-1.5">
        {rows.map((row) => (
          <div className="flex items-baseline justify-between gap-2" key={row.label}>
            <dt className="label-caps text-outline">{row.label}</dt>
            <dd className="font-mono text-sm tracking-[0.05em] text-fg">
              {row.value}
              {row.unit ? <span className="ml-1 text-[10px] text-outline">{row.unit}</span> : null}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <p className="label-caps text-outline">SYSTEM_CHARGE</p>
          <p className="font-mono text-sm text-lavender">{systemCharge}%</p>
        </div>
        <div aria-hidden className="mt-1.5 h-1 rounded-full bg-surface-high">
          <div
            className="h-full rounded-full bg-lavender shadow-glow-lavender transition-all duration-700"
            style={{ width: `${systemCharge}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] text-outline">Weekly working sets vs 48-set target.</p>
      </div>
    </div>
  );
}

function LatestLogs({
  isLoading,
  sessions
}: {
  isLoading: boolean;
  sessions: WorkoutSummary[];
}): ReactNode {
  if (isLoading) {
    return <Skeleton className="mt-2 h-9" />;
  }

  if (sessions.length === 0) {
    return (
      <p className="mt-2 text-xs text-fg-muted">
        No sessions logged yet — initialize the first one to activate telemetry.
      </p>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
      {sessions.map((session) => (
        <Link className="group min-w-0" href={`/workouts/${session.id}`} key={session.id}>
          <span className="block text-[10px] uppercase tracking-[0.08em] text-outline">
            {shortDate(session.startedAt)}
          </span>
          <span className="block truncate font-display text-xs font-bold uppercase tracking-[0.1em] text-fg-muted transition-colors group-hover:text-cyan">
            {sessionTitle(session)}
          </span>
        </Link>
      ))}
    </div>
  );
}

function sessionTitle(session: WorkoutSummary): string {
  if (session.title) {
    return cockpitLabel(session.title);
  }

  if (session.workoutType) {
    return cockpitLabel(session.workoutType);
  }

  return `SESSION_${shortDate(session.startedAt).replace(/\s+/g, "_")}`;
}
