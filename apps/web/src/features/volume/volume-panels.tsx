"use client";

import Link from "next/link";
import { radioGroupKeyDown } from "../../shared/ui/radio-group";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { formatDay, formatNumber } from "../../shared/format";
import { IconClose, IconForward } from "../../shared/ui/icons";
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

/** Shared outline: keeps the palest stages visible on the light card. */
const SWATCH_OUTLINE = "#5b3aa8";

/**
 * One compact row: the six stages as a strip, each with its upper bound in
 * sets per week. The full wording stays available to screen readers.
 */
export function HeatLegend({ heatCeiling }: { heatCeiling: number }): ReactNode {
  const stages = [
    { color: volumeRampCss(0), short: "0", label: "No sets" },
    ...HEAT_STAGE_COLORS.map((color, index) => ({
      color,
      short: index === 4 ? `${formatNumber((4 * heatCeiling) / 5)}+` : formatNumber(((index + 1) * heatCeiling) / 5),
      label: heatRangeLabel(index + 1, heatCeiling)
    }))
  ];
  return (
    <div className="rounded-[var(--radius-card)] bg-surface px-4 py-3">
      <div className="flex items-baseline justify-between gap-3 text-footnote text-text-secondary">
        <span>Sets per week</span>
        <Link className="inline-flex min-h-11 -my-3 items-center text-accent" href="/settings">
          Full color at <span className="num ml-1">{formatNumber(heatCeiling)}</span>
        </Link>
      </div>
      <ul aria-label="Working set heat ranges" className="mt-1.5 grid grid-cols-6 gap-1">
        {stages.map((stage) => (
          <li className="min-w-0" key={stage.label}>
            <span aria-hidden className="block h-3 rounded-[var(--radius-sm)] border-[1.5px]" style={{ background: stage.color, borderColor: SWATCH_OUTLINE }} />
            <span aria-hidden className="num mt-1 block text-center text-caption text-text-muted">{stage.short}</span>
            <span className="sr-only">{stage.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The tapped muscle, right under the figure. For one week the numbers are
 * just that week's sets; for longer windows, the weekly average and the total.
 */
export function MuscleIntel({
  workoutHref,
  aggregate,
  heatCeiling,
  onClose,
  windowDays,
  windowLabel
}: {
  workoutHref?: ((id: string) => string) | undefined;
  aggregate: MuscleAggregate;
  heatCeiling: number;
  onClose: () => void;
  windowDays: number;
  windowLabel: string;
}): ReactNode {
  const oneWeek = windowDays <= 7;
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-title-3 text-text">{aggregate.name}</h2>
          <p className="mt-0.5 flex items-center gap-2 text-subhead text-text-secondary">
            <span aria-hidden className="size-2.5 shrink-0 rounded-full border" style={{ background: volumeRampCss(aggregate.weeklyAvg, heatCeiling), borderColor: SWATCH_OUTLINE }} />
            {loadStatus(aggregate.weeklyAvg, heatCeiling)}
          </p>
        </div>
        <button aria-label={`Close ${aggregate.name}`} className="-mr-2 -mt-1 flex size-11 shrink-0 items-center justify-center rounded-full text-text-secondary active:bg-surface-raised" onClick={onClose} type="button">
          <IconClose />
        </button>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-4">
        {oneWeek ? (
          <>
            <IntelTile label="Last 7 days" unit="sets" value={aggregate.totalSets} />
            <IntelTile label="Workouts" value={aggregate.sessions.length} />
          </>
        ) : (
          <>
            <IntelTile label="Per week" unit="sets" value={formatNumber(aggregate.weeklyAvg)} />
            <IntelTile label={`Total, ${windowLabel}`} unit="sets" value={aggregate.totalSets} />
          </>
        )}
      </dl>
      <ContributionList aggregate={aggregate} workoutHref={workoutHref} />
    </div>
  );
}

function IntelTile({ label, unit, value }: { label: string; unit?: string; value: ReactNode }): ReactNode {
  return (
    <div className="min-w-0">
      <dt className="truncate text-footnote text-text-secondary">{label}</dt>
      <dd className="num text-title-3 text-text">{value}{unit ? <span className="ml-1 text-callout text-text-secondary">{unit}</span> : null}</dd>
    </div>
  );
}

function ContributionList({ aggregate, workoutHref }: { aggregate: MuscleAggregate; workoutHref?: ((id: string) => string) | undefined }): ReactNode {
  return (
    <>
      {aggregate.exercises.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-subhead font-semibold text-text-secondary">Exercises</h3>
          <ul className="mt-1 divide-y divide-line">
            {aggregate.exercises.slice(0, 3).map((exercise) => (
              <li className="flex min-h-11 items-center justify-between gap-3" key={exercise.id}>
                <span className="min-w-0 truncate text-body text-text">{exercise.name}</span>
                <span className="num flex-none text-callout text-text-secondary">{exercise.sets} sets</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {aggregate.sessions.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-subhead font-semibold text-text-secondary">Recent workouts</h3>
          <ul className="mt-1 divide-y divide-line">
            {aggregate.sessions.slice(0, 3).map((session) => (
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
        {/* Neutral track (no black bar in light mode); the fill carries the swatch outline. */}
        <span aria-hidden className="h-2.5 min-w-0 flex-1 rounded-full bg-surface-raised">
          {row.weeklyAvg > 0 ? (
            <span className="block h-full min-w-2.5 rounded-full border" style={{ width: `${heatBarWidth(row.weeklyAvg, heatCeiling)}%`, background: volumeRampCss(row.weeklyAvg, heatCeiling), borderColor: SWATCH_OUTLINE }} />
          ) : null}
        </span>
        <span className="num w-10 shrink-0 text-right text-callout text-text-secondary">{formatNumber(row.weeklyAvg)}</span>
      </button>
    </li>
  );
}

function loadStatus(weeklyAvg: number, heatCeiling: number): string {
  return weeklyAvg <= 0 ? "No sets recorded" : heatRangeLabel(heatBucket(weeklyAvg, heatCeiling), heatCeiling);
}
