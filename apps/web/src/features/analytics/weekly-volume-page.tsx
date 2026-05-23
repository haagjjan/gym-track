"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getWeeklyVolume } from "./analytics-api";
import { dateRange } from "./analytics-date-range";
import { AnalyticsHeader } from "./analytics-header";
import type { WeeklyVolumePayload } from "./analytics-types";
import { currentWeekTotals, WeeklyBodyMap, type WeeklyMuscleTotal } from "./weekly-body-map";

export function WeeklyVolumePage(): ReactNode {
  const [volume, setVolume] = useState<WeeklyVolumePayload | null>(null);
  const [selectedSlug, setSelectedSlug] = useState("chest");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const range = useMemo(() => dateRange(7), []);
  const totals = useMemo(() => currentWeekTotals(volume ?? { weeks: [] }), [volume]);
  const selected = totals.get(selectedSlug) ?? firstMuscle(totals);

  const loadWeeklyVolume = useCallback(async (signal: AbortSignal): Promise<void> => {
    const result = await getWeeklyVolume({ ...range, signal }).catch(() => null);

    if (signal.aborted) {
      return;
    }

    setIsLoading(false);

    if (!result || !result.ok) {
      setError(result?.message ?? "Weekly volume could not be loaded.");
      return;
    }

    setVolume(result.data);
    setSelectedSlug(result.data.weeks.at(-1)?.items[0]?.muscleGroup.slug ?? "chest");
  }, [range]);

  useEffect(() => {
    const controller = new AbortController();

    void loadWeeklyVolume(controller.signal);

    return () => controller.abort();
  }, [loadWeeklyVolume]);

  return (
    <main className="analyticsPage weeklyVolumePage">
      <AnalyticsHeader
        eyebrow="Weekly Volume"
        links={[{ href: "/progress", label: "Progress" }]}
        title="Muscle heat map"
      />
      {error ? <p className="formError analyticsMessage" role="alert">{error}</p> : null}
      <section className="analyticsPanel bodyVolumePanel" aria-labelledby="weekly-volume-title">
        <div className="analyticsPanelHeader compactHeader">
          <div>
            <p className="eyebrow">Current week</p>
            <h2 id="weekly-volume-title">Working sets by muscle</h2>
          </div>
        </div>
        {isLoading ? <p className="mutedText">Loading weekly volume.</p> : null}
        {volume ? (
          <div className="bodyVolumeGrid">
            <WeeklyBodyMap selectedSlug={selectedSlug} volume={volume} onSelect={setSelectedSlug} />
            <MuscleStats selected={selected} />
          </div>
        ) : null}
      </section>
    </main>
  );
}

function MuscleStats({ selected }: { selected: WeeklyMuscleTotal | null }): ReactNode {
  if (!selected) {
    return (
      <aside className="muscleStats">
        <p className="eyebrow">Selected muscle</p>
        <h2>No training volume yet</h2>
        <p className="mutedText">Log working sets this week to color the body map.</p>
      </aside>
    );
  }

  return (
    <aside className="muscleStats">
      <p className="eyebrow">Selected muscle</p>
      <h2>{selected.muscleGroup.name}</h2>
      <div className="analyticsMetrics singleMetric">
        <div className="analyticsMetric">
          <span>Working sets</span>
          <strong>{selected.workingSets}</strong>
        </div>
      </div>
      <section>
        <h3>Exercises</h3>
        <div className="statList">
          {selected.exercises.map((exercise) => (
            <p key={exercise.id}>
              <span>{exercise.name}</span>
              <strong>{exercise.workingSets}</strong>
            </p>
          ))}
        </div>
      </section>
      <section>
        <h3>Recent sessions</h3>
        <div className="statList">
          {selected.recentSessions.map((session) => (
            <Link key={session.workoutId} href={`/workouts/${session.workoutId}`}>
              <span>{shortDate(session.sessionDate)}</span>
              <strong>{session.workingSets}</strong>
            </Link>
          ))}
        </div>
      </section>
    </aside>
  );
}

function firstMuscle(totals: Map<string, WeeklyMuscleTotal>): WeeklyMuscleTotal | null {
  return totals.values().next().value ?? null;
}

function shortDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}
