"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { EmptyState, ErrorState, Metric, Panel, Skeleton } from "../../shared/ui/ui";
import { BayAmbience } from "../avatar/bay-ambience";
//import { useDisplaySettings } from "../dashboard/use-display-settings";
import { errorMessage } from "../../shared/api/client";
import { useUserPreferences, useWeeklyVolume } from "../../shared/api/hooks";
//import { BodyMap2D } from "./body-map-2d";
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
      <div className="flex h-full items-center justify-center">
        <p className="label-caps animate-pulse-slow text-cyan-dim">Loading the body map</p>
      </div>
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
  const [selectedSlug, setSelectedSlug] = useState<RegionSlug | null>(null);
  //const { settings: displaySettings, isLoaded: displaySettingsLoaded } =
  //  useDisplaySettings();
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
    setSelectedSlug((current) => (slug !== null && current === slug ? null : slug));
  }, []);

  const selected = selectedSlug ? aggregates.get(selectedSlug) ?? null : null;
  const windowTotal = [...aggregates.values()].reduce(
    (sum, aggregate) => sum + aggregate.totalSets,
    0
  );
  const activeMuscles = [...aggregates.values()].filter(
    (aggregate) => aggregate.totalSets > 0
  ).length;
  const latestWeekTotal = [...aggregates.values()].reduce(
    (sum, aggregate) => sum + aggregate.latestWeekSets,
    0
  );
  const windowLabel =
    volumeWindows.find((item) => item.days === windowDays)?.label ?? `${windowDays}D`;

  return (
    <div className="hud-grid relative isolate min-h-full">
      <BayAmbience />

      <div className="relative z-10 mx-auto max-w-6xl space-y-4 p-4 lg:p-6">
        <header>
          <div>
            //<p className="label-caps text-outline">BODY_RECONSTRUCTION</p>
            <h1 className="font-display text-2xl font-bold tracking-tight text-fg">
              Muscle volume
            </h1>
          </div>
        </header>

        {volume.isError ? (
          <ErrorState
            message={errorMessage(volume.error, "Weekly volume could not be loaded.")}
            retry={() => void volume.refetch()}
          />
        ) : null}

        <div className="hidden grid-cols-2 gap-3 lg:grid">
          <Panel accent="none">
            <Metric
              label="Muscles trained"
              value={volume.isLoading ? "…" : String(activeMuscles)}
            />
          </Panel>
          <Panel accent="lavender">
            <Metric
              label="This week"
              tone="lavender"
              value={volume.isLoading ? "…" : String(latestWeekTotal)}
              detail="working sets"
            />
          </Panel>
        </div>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-4">
          {/* ===== Body map: borderless region, body only (no environment) ===== */}
          <div className="relative mb-4 lg:mb-0">
            <div className="h-[52dvh] min-h-80 lg:h-[560px]">
              <WindowControls onChange={setWindowDays} value={windowDays} />
              <VolumeBodyMap
                debugRegions={debugRegions}
                heatCeiling={heatCeiling}
                onSelect={handleSelect}
                selectedSlug={selectedSlug}
                weeklySetsBySlug={weeklySetsBySlug}
              />
            </div>

            <Panel accent="cyan" className="glass-cyan mt-3" eyebrow="Heat scale">
              <HeatLegend heatCeiling={heatCeiling} />

              {!volume.isLoading && windowTotal === 0 ? (
                <p className="mt-3 rounded border border-outline-dim/60 bg-surface-low/40 px-3 py-2 text-[11px] text-fg-muted">
                  No working sets in this window yet — muscles stay dark until you log training.
                </p>
              ) : null}
            </Panel>

            <div className="mt-3 grid grid-cols-2 gap-3 lg:hidden">
              <Panel accent="none">
                <Metric
                  label="Muscles trained"
                  value={volume.isLoading ? "…" : String(activeMuscles)}
                />
              </Panel>
              <Panel accent="lavender">
                <Metric
                  detail="working sets"
                  label="This week"
                  tone="lavender"
                  value={volume.isLoading ? "…" : String(latestWeekTotal)}
                />
              </Panel>
            </div>
          </div>

          {/* ===== Side stack ===== */}
          <div className="space-y-4">
            <Panel accent="lavender" eyebrow="Selected muscle">
              {volume.isLoading ? (
                <Skeleton className="h-40" />
              ) : selected ? (
                <MuscleIntel
                  aggregate={selected}
                  heatCeiling={heatCeiling}
                  windowLabel={windowLabel}
                />
              ) : (
                <EmptyState
                  message="Tap a muscle on the body, or a row below, to see its detail."
                  title="Nothing selected"
                />
              )}
            </Panel>

            <Panel accent="cyan" eyebrow="All muscles">
              {volume.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8" />
                  <Skeleton className="h-8" />
                  <Skeleton className="h-8" />
                </div>
              ) : (
                <DistributionMatrix
                  aggregates={aggregates}
                  heatCeiling={heatCeiling}
                  onSelect={handleSelect}
                  selectedSlug={selectedSlug}
                />
              )}
              <div className="mt-3 flex items-baseline justify-between border-t border-outline-dim/60 pt-3">
                <span className="label-caps text-outline">Total working sets</span>
                <span className="font-mono text-sm text-fg">
                  {volume.isLoading ? "…" : windowTotal}{" "}
                  <span className="text-outline">{"// "}{windowLabel}</span>
                </span>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
