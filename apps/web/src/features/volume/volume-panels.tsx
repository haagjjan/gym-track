"use client";

import Link from "next/link";
import { useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { EmptyState } from "../../shared/ui/ui";
import { formatNumber, shortDate } from "../../shared/format";
import {
  HEAT_STAGE_COLORS,
  heatBarWidth,
  heatBucket,
  heatRangeLabel,
  REGION_SLUGS,
  volumeRampCss,
  type RegionSlug
} from "./heatmap";
import type { MuscleAggregate } from "./volume-aggregation";

export const volumeWindows = [
  { label: "1W", days: 7 },
  { label: "1M", days: 30 },
  { label: "3M", days: 90 }
] as const;

export type VolumeWindowDays = (typeof volumeWindows)[number]["days"];

export function WindowControls({
  onChange,
  value
}: {
  onChange: Dispatch<SetStateAction<VolumeWindowDays>>;
  value: VolumeWindowDays;
}): ReactNode {
  return (
    <div aria-label="Volume window" className="absolute right-3 top-3 z-10 flex gap-1 rounded bg-void/75 p-1" role="radiogroup">
      {volumeWindows.map((item) => (
        <button
          aria-checked={value === item.days}
          className={`label-caps min-h-11 min-w-11 cursor-pointer rounded border px-2 transition-colors ${value === item.days ? "border-cyan bg-cyan/15 text-cyan" : "border-outline-dim text-outline"}`}
          key={item.days}
          onClick={() => onChange(item.days)}
          role="radio"
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function HeatLegend({ heatCeiling }: { heatCeiling: number }): ReactNode {
  const [activeBucket, setActiveBucket] = useState<number | null>(null);
  return (
    <div className="mt-3">
      <div aria-label="Working set heat ranges" className="grid grid-cols-5 gap-1">
        {HEAT_STAGE_COLORS.map((color, index) => (
          <button
            aria-label={heatRangeLabel(index + 1, heatCeiling)}
            className="flex min-h-11 items-center rounded-sm outline-none ring-offset-2 ring-offset-void hover:ring-2 hover:ring-lavender focus-visible:ring-2 focus-visible:ring-lavender"
            key={color}
            onBlur={() => setActiveBucket(null)}
            onClick={() => setActiveBucket((current) => current === index + 1 ? null : index + 1)}
            onFocus={() => setActiveBucket(index + 1)}
            onMouseEnter={() => setActiveBucket(index + 1)}
            onMouseLeave={() => setActiveBucket(null)}
            title={heatRangeLabel(index + 1, heatCeiling)}
            type="button"
          >
            <span aria-hidden className="h-2 w-full rounded-sm" style={{ background: color }} />
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[9px] uppercase tracking-[0.08em] text-outline">
        <span>{`>0–${formatNumber(heatCeiling / 5)}`}</span>
        <span>{`${heatCeiling}+ sets/wk`}</span>
      </div>
      <p aria-live="polite" className="mt-2 min-h-4 text-center font-mono text-[10px] uppercase tracking-[0.06em] text-lavender">
        {activeBucket ? heatRangeLabel(activeBucket, heatCeiling) : "Tap or focus a color to see its set range"}
      </p>
    </div>
  );
}

export function MuscleIntel({
  aggregate,
  heatCeiling,
  windowLabel
}: {
  aggregate: MuscleAggregate;
  heatCeiling: number;
  windowLabel: string;
}): ReactNode {
  return (
    <div>
      <h2 className="font-display text-lg font-bold tracking-tight text-fg">{aggregate.name}</h2>
      <p className="label-caps mt-0.5 text-lavender">{loadStatus(aggregate.weeklyAvg, heatCeiling)}</p>
      <dl className="mt-3 space-y-1.5">
        <IntelRow label="Weekly average" value={`${formatNumber(aggregate.weeklyAvg)} sets`} />
        <IntelRow label={`${windowLabel} total`} value={`${aggregate.totalSets} sets`} />
        <IntelRow label="This week" value={`${aggregate.latestWeekSets} sets`} />
      </dl>
      <ContributionList aggregate={aggregate} />
    </div>
  );
}

function ContributionList({ aggregate }: { aggregate: MuscleAggregate }): ReactNode {
  return (
    <>
      {aggregate.exercises.length > 0 ? (
        <div className="mt-4">
          <p className="label-caps text-outline">Lifts that trained it</p>
          <ul className="mt-1.5 space-y-1">
            {aggregate.exercises.slice(0, 5).map((exercise) => (
              <li className="flex items-baseline justify-between gap-2" key={exercise.id}>
                <span className="min-w-0 truncate text-xs text-fg">{exercise.name}</span>
                <span className="font-mono text-[11px] text-fg-muted">{exercise.sets}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {aggregate.sessions.length > 0 ? (
        <div className="mt-4">
          <p className="label-caps text-outline">Recent workouts</p>
          <ul className="mt-1.5 space-y-1">
            {aggregate.sessions.slice(0, 4).map((session) => (
              <li key={`${session.workoutId}-${session.date}`}>
                <Link className="flex items-baseline justify-between gap-2 rounded px-1 py-0.5 transition-colors hover:bg-surface-low" href={`/workouts/${session.workoutId}`}>
                  <span className="font-mono text-[11px] uppercase text-fg-muted">{shortDate(session.date)}</span>
                  <span className="font-mono text-[11px] text-fg">{session.sets} sets</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

function IntelRow({ label, value }: { label: string; value: string }): ReactNode {
  return <div className="flex items-baseline justify-between gap-2"><dt className="label-caps text-outline">{label}</dt><dd className="font-mono text-sm tracking-[0.05em] text-fg">{value}</dd></div>;
}

export function DistributionMatrix({
  aggregates,
  heatCeiling,
  onSelect,
  selectedSlug
}: {
  aggregates: Map<string, MuscleAggregate>;
  heatCeiling: number;
  onSelect: (slug: RegionSlug) => void;
  selectedSlug: string | null;
}): ReactNode {
  const rows = [...aggregates.values()].sort((left, right) => right.weeklyAvg - left.weeklyAvg);
  if (rows.length === 0) return <EmptyState message="Muscle groups appear here once this window has logged sets." title="Nothing logged yet" />;

  return (
    <ul className="space-y-1">
      {rows.map((row) => (
        <DistributionRow
          heatCeiling={heatCeiling}
          isSelected={row.slug === selectedSlug}
          key={row.slug}
          onSelect={onSelect}
          row={row}
        />
      ))}
    </ul>
  );
}

function DistributionRow({ heatCeiling, isSelected, onSelect, row }: { heatCeiling: number; isSelected: boolean; onSelect: (slug: RegionSlug) => void; row: MuscleAggregate }): ReactNode {
  const isRegion = REGION_SLUGS.includes(row.slug as RegionSlug);
  return (
    <li>
      <button className={`flex min-h-9 w-full cursor-pointer items-center gap-2 rounded border px-2 transition-colors ${isSelected ? "border-cyan/60 bg-cyan/10" : "border-transparent hover:bg-surface-low"}`} disabled={!isRegion} onClick={() => isRegion && onSelect(row.slug as RegionSlug)} type="button">
        <span className="w-24 shrink-0 truncate text-left text-xs text-fg">{row.name}</span>
        <span aria-hidden className="h-1.5 min-w-0 flex-1 rounded-full bg-surface-high">
          <span className="block h-full rounded-full" style={{ width: `${heatBarWidth(row.weeklyAvg, heatCeiling)}%`, background: volumeRampCss(row.weeklyAvg, heatCeiling) }} />
        </span>
        <span className="w-10 shrink-0 text-right font-mono text-[11px] text-fg-muted">{formatNumber(row.weeklyAvg)}</span>
      </button>
    </li>
  );
}

function loadStatus(weeklyAvg: number, heatCeiling: number): string {
  return weeklyAvg <= 0 ? "NO_RECORDED_SETS" : `HEAT_STAGE_${heatBucket(weeklyAvg, heatCeiling)}`;
}
