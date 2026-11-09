"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getWeeklyVolume } from "./analytics-api";
import { dateRange } from "./analytics-date-range";
import type { WeeklyVolumePayload } from "./analytics-types";
import {
  aggregateVolume,
  firstVolumeSlug,
  latestWeekWorkingSets,
  selectedVolumeMuscle,
  totalWorkingSets,
  volumeWindowWeeks
} from "./volume-analytics";
import { VolumeDistributionMatrix } from "./volume-distribution-matrix";
import { VolumeEmptyState } from "./volume-empty-state";
import {
  VolumeIntelligencePanel,
  VolumeLegend,
  VolumeMetricDeck
} from "./volume-widgets";
import {
  handleVolumePointerLeave,
  handleVolumePointerMove
} from "./volume-pointer";
import { WeeklyBodyMap } from "./weekly-body-map";

const volumeWindows = [
  { label: "1W", value: "7" },
  { label: "1M", value: "30" },
  { label: "3M", value: "90" }
] as const;

type VolumeWindow = (typeof volumeWindows)[number]["value"];

export function WeeklyVolumePage(): ReactNode {
  const [volume, setVolume] = useState<WeeklyVolumePayload | null>(null);
  const [selectedSlug, setSelectedSlug] = useState("chest");
  const [timeWindow, setTimeWindow] = useState<VolumeWindow>("7");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const selectedWindow = volumeWindows.find((item) => item.value === timeWindow) ?? volumeWindows[0];
  const range = useMemo(() => dateRange(Number(timeWindow)), [timeWindow]);
  const windowWeeks = volumeWindowWeeks(Number(timeWindow));
  const totals = useMemo(() => aggregateVolume(volume, windowWeeks), [volume, windowWeeks]);
  const selected = useMemo(() => selectedVolumeMuscle(totals, selectedSlug), [selectedSlug, totals]);
  const activeMuscles = [...totals.values()].filter((item) => item.workingSets > 0).length;
  const windowTotalSets = totalWorkingSets(totals);
  const latestWeekSets = latestWeekWorkingSets(totals);

  const loadWeeklyVolume = useCallback(async (signal: AbortSignal): Promise<void> => {
    setIsLoading(true);
    setError(null);

    const result = await getWeeklyVolume({ ...range, signal }).catch(() => null);

    if (signal.aborted) {
      return;
    }

    setIsLoading(false);

    if (!result || !result.ok) {
      setError(result?.message ?? "Weekly volume could not be loaded.");
      return;
    }

    const nextTotals = aggregateVolume(result.data, windowWeeks);

    setVolume(result.data);
    setSelectedSlug((current) => current && nextTotals.has(current) ? current : firstVolumeSlug(nextTotals));
  }, [range, windowWeeks]);

  useEffect(() => {
    const controller = new AbortController();

    void loadWeeklyVolume(controller.signal);

    return () => controller.abort();
  }, [loadWeeklyVolume]);

  return (
    <main className="analyticsPage weeklyVolumePage">
      <header className="volumeHero">
        <div>
          <nav className="pageNav" aria-label="Analytics navigation">
            <Link className="backLink" href="/">Home</Link>
            <Link className="backLink" href="/workouts">History</Link>
            <Link className="backLink" href="/progress">Progress</Link>
          </nav>
          <p className="eyebrow">Volume heatmap</p>
          <h1>Muscle volume</h1>
          <p className="leadText">
            See where the week is loaded, then tap a muscle to inspect the real set distribution.
          </p>
        </div>
        <div className="volumeHeroBadge" aria-label="Volume scan status">
          <span>BODY_RECONSTRUCTION</span>
          <strong>{selected?.muscleGroup.name ?? "No target"}</strong>
          <small>{activeMuscles} active muscle groups</small>
        </div>
      </header>

      {error ? <p className="formError analyticsMessage" role="alert">{error}</p> : null}

      <section className="volumeControlBar" aria-label="Volume time range">
        <div>
          <p className="eyebrow">Scan window</p>
          <h2>{selectedWindow.label} load distribution</h2>
        </div>
        <div className="volumeRangeTabs" aria-label="Time window">
          {volumeWindows.map((item) => (
            <button
              aria-pressed={timeWindow === item.value}
              key={item.value}
              onClick={() => setTimeWindow(item.value)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <VolumeMetricDeck
        activeMuscles={activeMuscles}
        latestWeekSets={latestWeekSets}
        selected={selected}
        totals={totals}
        windowLabel={selectedWindow.label}
      />

      <section className="volumeWorkspace" aria-label="Weekly volume workspace">
        <section
          className="volumeMapPanel volumeReactive"
          aria-labelledby="volume-map-title"
          onPointerLeave={handleVolumePointerLeave}
          onPointerMove={handleVolumePointerMove}
        >
          <div className="volumeSectionHeader">
            <div>
              <p className="eyebrow">Body map</p>
              <h2 id="volume-map-title">Front / back working-set signal</h2>
            </div>
            <span>{isLoading ? "SCANNING" : `${windowTotalSets} sets`}</span>
          </div>

          {isLoading ? (
            <VolumeEmptyState title="SCANNING_VOLUME" message="Reading weekly muscle volume." />
          ) : null}

          {!isLoading && windowTotalSets === 0 ? (
            <VolumeEmptyState
              title="NO_VOLUME_DATA"
              message="Complete working sets to illuminate muscle groups in this window."
            />
          ) : null}

          <WeeklyBodyMap selectedSlug={selectedSlug} totals={totals} onSelect={setSelectedSlug} />
          <VolumeLegend />
        </section>

        <div className="volumeSideStack">
          <VolumeIntelligencePanel
            latestWeekSets={latestWeekSets}
            selected={selected}
            windowLabel={selectedWindow.label}
            windowTotalSets={windowTotalSets}
          />
          <VolumeDistributionMatrix
            onSelect={setSelectedSlug}
            selectedSlug={selectedSlug}
            totals={totals}
          />
        </div>
      </section>
    </main>
  );
}
