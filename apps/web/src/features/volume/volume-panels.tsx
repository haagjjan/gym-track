"use client";

import Link from "next/link";
import { radioGroupKeyDown } from "../../shared/ui/radio-group";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { formatDay, formatNumber } from "../../shared/format";
import { IconForward } from "../../shared/ui/icons";
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
  { label: "1W", days: 7, words: "last 7 days" },
  { label: "1M", days: 30, words: "last 30 days" },
  { label: "3M", days: 90, words: "last 90 days" }
] as const;

export type VolumeWindowDays = (typeof volumeWindows)[number]["days"];

/** iOS-style segmented control; every segment is at least 44 px tall. */
export function Segmented<T extends string | number>({
  label,
  onChange,
  options,
  value
}: {
  label: string;
  onChange: (value: T) => void;
  options: readonly { id: T; label: string; ariaLabel?: string }[];
  value: T | null;
}): ReactNode {
  return (
    <div aria-label={label} className="flex rounded-full bg-surface p-1" onKeyDown={radioGroupKeyDown} role="radiogroup">
      {options.map((item) => (
        <button
          aria-checked={value === item.id}
          aria-label={item.ariaLabel}
          className={`min-h-11 min-w-11 cursor-pointer rounded-full px-3 text-callout ${value === item.id ? "bg-surface-raised font-semibold text-text" : "text-text-secondary"}`}
          key={item.id}
          onClick={() => onChange(item.id)}
          role="radio"
          tabIndex={(value === item.id) ? 0 : -1}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function WindowControls({
  onChange,
  value
}: {
  onChange: Dispatch<SetStateAction<VolumeWindowDays>>;
  value: VolumeWindowDays;
}): ReactNode {
  return (
    <Segmented
      label="Volume window"
      onChange={onChange}
      options={volumeWindows.map((item) => ({ id: item.days, label: item.label }))}
      value={value}
    />
  );
}

/** Always-visible legend: every stage with its set range in words. */
export function HeatLegend({ heatCeiling }: { heatCeiling: number }): ReactNode {
  return (
    <div className="rounded-[var(--radius-card)] bg-surface p-4">
      <p className="text-subhead text-text-secondary">
        Weekly sets for full color: <span className="num text-text">{formatNumber(heatCeiling)}</span>
      </p>
      {/* Swatches carry a dark purple outline so the palest stages stay visible on the light card. */}
      <ul aria-label="Working set heat ranges" className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-2">
        <li className="flex items-center gap-3 text-footnote text-text-secondary">
          <span aria-hidden className="h-4 w-10 flex-none rounded-[var(--radius-sm)] border-[1.5px] border-[#5b3aa8]" style={{ background: volumeRampCss(0) }} />
          No sets
        </li>
        {HEAT_STAGE_COLORS.map((color, index) => (
          <li className="flex items-center gap-3 text-footnote text-text-secondary" key={color}>
            <span aria-hidden className="h-4 w-10 flex-none rounded-[var(--radius-sm)] border-[1.5px] border-[#5b3aa8]" style={{ background: color }} />
            <span className="num">{heatRangeLabel(index + 1, heatCeiling)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MuscleIntel({
  workoutHref,
  aggregate,
  heatCeiling,
  windowLabel
}: {
  workoutHref?: ((id: string) => string) | undefined;
  aggregate: MuscleAggregate;
  heatCeiling: number;
  windowLabel: string;
}): ReactNode {
  return (
    <div>
      <h2 className="text-title-3 text-text">{aggregate.name}</h2>
      <p className="mt-0.5 text-subhead text-accent">{loadStatus(aggregate.weeklyAvg, heatCeiling)}</p>
      <dl className="mt-3 divide-y divide-line">
        <IntelRow label="Weekly average" value={`${formatNumber(aggregate.weeklyAvg)} sets`} />
        <IntelRow label={`Total, ${windowLabel}`} value={`${aggregate.totalSets} sets`} />
        <IntelRow label="This week" value={`${aggregate.latestWeekSets} sets`} />
      </dl>
      <ContributionList aggregate={aggregate} workoutHref={workoutHref} />
    </div>
  );
}

function ContributionList({ aggregate, workoutHref }: { aggregate: MuscleAggregate; workoutHref?: ((id: string) => string) | undefined }): ReactNode {
  return (
    <>
      {aggregate.exercises.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-headline text-text">Exercises that hit it</h3>
          <ul className="mt-1 divide-y divide-line">
            {aggregate.exercises.slice(0, 5).map((exercise) => (
              <li className="flex min-h-11 items-center justify-between gap-3" key={exercise.id}>
                <span className="min-w-0 truncate text-body text-text">{exercise.name}</span>
                <span className="num flex-none text-callout text-text-secondary">{exercise.sets} sets</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {aggregate.sessions.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-headline text-text">Recent workouts</h3>
          <ul className="mt-1 divide-y divide-line">
            {aggregate.sessions.slice(0, 4).map((session) => (
              <li key={`${session.workoutId}-${session.date}`}>
                <Link className="flex min-h-11 items-center justify-between gap-3 active:bg-surface-raised" href={workoutHref?.(session.workoutId) ?? `/workouts/${session.workoutId}`}>
                  <span className="text-body text-text">{formatDay(session.date)}</span>
                  <span className="flex items-center gap-1 text-callout text-text-secondary">
                    <span className="num">{session.sets} sets</span>
                    <IconForward />
                  </span>
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
  return <div className="flex min-h-11 items-center justify-between gap-3"><dt className="text-body text-text-secondary">{label}</dt><dd className="num text-body text-text">{value}</dd></div>;
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
  if (rows.length === 0) return null;

  return (
    <ul className="divide-y divide-line">
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
      <button aria-pressed={isSelected} className={`flex min-h-11 w-full cursor-pointer items-center gap-3 px-4 active:bg-surface-raised ${isSelected ? "bg-surface-raised" : ""}`} disabled={!isRegion} onClick={() => isRegion && onSelect(row.slug as RegionSlug)} type="button">
        <span className={`w-24 shrink-0 truncate text-left text-body ${isSelected ? "font-semibold text-text" : "text-text"}`}>{row.name}</span>
        <span aria-hidden className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-stage">
          <span className="block h-full rounded-full" style={{ width: `${heatBarWidth(row.weeklyAvg, heatCeiling)}%`, background: volumeRampCss(row.weeklyAvg, heatCeiling) }} />
        </span>
        <span className="num w-10 shrink-0 text-right text-callout text-text-secondary">{formatNumber(row.weeklyAvg)}</span>
      </button>
    </li>
  );
}

function loadStatus(weeklyAvg: number, heatCeiling: number): string {
  return weeklyAvg <= 0 ? "No sets recorded" : heatRangeLabel(heatBucket(weeklyAvg, heatCeiling), heatCeiling);
}
