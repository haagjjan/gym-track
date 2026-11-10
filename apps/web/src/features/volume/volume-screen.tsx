"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState, type Dispatch, type SetStateAction, type ReactNode } from "react";
import type { WeeklyVolumePayload } from "../../shared/api/types";
import Link from "next/link";
import { buttonClass } from "../../shared/ui/button";
import { ErrorState, Skeleton } from "../../shared/ui/ui";
import { errorMessage } from "../../shared/api/client";
import { useUserPreferences, useWeeklyVolume, useWorkouts } from "../../shared/api/hooks";
import {
  HEAT_MAX_WEEKLY_SETS,
  type RegionSlug
} from "./heatmap";
import {
  DistributionMatrix,
  HeatLegend,
  MuscleIntel,
  WindowControls,
  volumeWindows,
  type VolumeWindowDays
} from "./volume-panels";

const VolumeBodyMap = dynamic(
  () => import("./volume-body-map").then((module) => module.VolumeBodyMap),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="h-[52dvh] min-h-80 rounded-[var(--radius-card)] lg:h-[560px]" />
    )
  }
);

import { aggregateVolume } from "./volume-aggregation";

/**
 * Muscle volume with one exact five-stage heat scale shared by the 3D body,
 * the legend, and the distribution matrix.
 */
export function VolumeScreen(): ReactNode {
  const [windowDays, setWindowDays] = useState<VolumeWindowDays>(7);
  const volume = useWeeklyVolume(windowDays);
  const preferences = useUserPreferences();
  const heatCeiling = preferences.data?.volumeHeatCeiling ?? HEAT_MAX_WEEKLY_SETS;
  return <VolumeView volume={volume} heatCeiling={heatCeiling} windowDays={windowDays} setWindowDays={setWindowDays} />;
}

export function VolumeView({ volume, heatCeiling = HEAT_MAX_WEEKLY_SETS, windowDays, setWindowDays, onSelectMuscle, workoutHref }: {
  volume: { data: WeeklyVolumePayload | undefined; isLoading: boolean; isError: boolean; error: Error | null; refetch: () => unknown };
  heatCeiling?: number; windowDays: VolumeWindowDays; setWindowDays: Dispatch<SetStateAction<VolumeWindowDays>>;
  onSelectMuscle?: (slug: RegionSlug) => void; workoutHref?: (id: string) => string;
}): ReactNode {
  const [selectedSlug, setSelectedSlug] = useState<RegionSlug | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [debugRegions] = useState(
    () => typeof window !== "undefined" && window.location.search.includes("debugRegions")
  );

  const weeksCount = Math.max(1, Math.round(windowDays / 7));
  const aggregates = useMemo(
    () => aggregateVolume(volume.data, weeksCount),
    [volume.data, weeksCount]
  );

  const weeklySetsBySlug = useMemo(() => {
    const map: Record<string, number> = {};

    for (const aggregate of aggregates.values()) {
      map[aggregate.slug] = aggregate.weeklyAvg;
    }

    return map;
  }, [aggregates]);

  const handleSelect = useCallback((slug: RegionSlug | null): void => {
    if (slug !== null) onSelectMuscle?.(slug);
    setSelectedSlug((current) => (slug !== null && current === slug ? null : slug));
  }, [onSelectMuscle]);

  // From the list: glide back up to the figure so the turn to that muscle is
  // visible, with its card right below. Taps on the figure don't scroll at all.
  const handleListSelect = useCallback((slug: RegionSlug): void => {
    handleSelect(slug);
    const stage = stageRef.current;
    if (!stage || stage.getBoundingClientRect().top >= 0) return;
    const reduce = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    stage.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [handleSelect]);

  const selected = selectedSlug ? aggregates.get(selectedSlug) ?? null : null;
  const windowTotal = [...aggregates.values()].reduce(
    (sum, aggregate) => sum + aggregate.totalSets,
    0
  );
  const windowLabel =
    volumeWindows.find((item) => item.days === windowDays)?.words ?? `last ${windowDays} days`;

  const hasNoSets = !volume.isLoading && !volume.isError && windowTotal === 0;
  // Same query as the shell's mini bar, which already resumes an open workout.
  const hasOpenWorkout = useWorkouts(20).data?.items.some((workout) => workout.isOpen) ?? false;

  return (
    <div className="mx-auto min-h-full max-w-6xl space-y-4 px-4 pb-8 pt-4 lg:px-6">
      <h1 className="text-large-title text-text">Muscle volume</h1>

      {volume.isError ? (
        <ErrorState
          message={errorMessage(volume.error, "Couldn't load your muscle volume. Check your connection and try again.")}
          retry={() => void volume.refetch()}
        />
      ) : null}

      {hasNoSets ? (
        <div className="rounded-[var(--radius-card)] bg-surface p-4">
          <p className="text-body text-text">No sets in the {windowLabel} yet. Log a workout and your muscles light up.</p>
          {hasOpenWorkout ? null : <Link className={`${buttonClass("primary")} mt-3 w-full`} href="/workout">Start workout</Link>}
        </div>
      ) : null}

      <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6 lg:space-y-0">
        <div className="scroll-mt-4 space-y-3" ref={stageRef}>
          <VolumeBodyMap
            debugRegions={debugRegions}
            heatCeiling={heatCeiling}
            onSelect={handleSelect}
            selectedSlug={selectedSlug}
            toolbarEnd={<WindowControls onChange={setWindowDays} value={windowDays} />}
            weeklySetsBySlug={weeklySetsBySlug}
          />

          {selected && !volume.isLoading ? (
            <section aria-label="Selected muscle" className="rounded-[var(--radius-card)] bg-surface p-4">
              <MuscleIntel
                aggregate={selected}
                heatCeiling={heatCeiling}
                onClose={() => setSelectedSlug(null)}
                windowDays={windowDays}
                windowLabel={windowLabel}
                workoutHref={workoutHref}
              />
            </section>
          ) : null}

          <HeatLegend heatCeiling={heatCeiling} />
        </div>

        <div className="space-y-4">

          {volume.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-11 rounded-[var(--radius-card)]" />
              <Skeleton className="h-11 rounded-[var(--radius-card)]" />
              <Skeleton className="h-11 rounded-[var(--radius-card)]" />
            </div>
          ) : !hasNoSets && windowTotal > 0 ? (
            <section>
              <h2 className="mb-2 px-4 text-headline text-text">All muscles</h2>
              <div className="overflow-hidden rounded-[var(--radius-card)] bg-surface">
                <DistributionMatrix
                  aggregates={aggregates}
                  heatCeiling={heatCeiling}
                  onSelect={handleListSelect}
                  selectedSlug={selectedSlug}
                />
                <div className="flex min-h-11 items-center justify-between border-t border-line px-4">
                  <span className="text-body text-text-secondary">Total, {windowLabel}</span>
                  <span className="num text-body text-text">{windowTotal} sets</span>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
