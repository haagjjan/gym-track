"use client";

import type { ReactNode } from "react";
import type { MuscleGroup, WeeklyVolumePayload } from "./analytics-types";

const regions = [
  { slug: "chest", label: "Chest", view: "front", x: 130, y: 92, w: 52, h: 42 },
  { slug: "abs", label: "Abs", view: "front", x: 141, y: 137, w: 30, h: 62 },
  { slug: "shoulders", label: "Shoulders", view: "front", x: 95, y: 86, w: 34, h: 34 },
  { slug: "biceps", label: "Biceps", view: "front", x: 78, y: 124, w: 24, h: 58 },
  { slug: "forearms", label: "Forearms", view: "front", x: 63, y: 180, w: 22, h: 70 },
  { slug: "quads", label: "Quads", view: "front", x: 122, y: 218, w: 30, h: 98 },
  { slug: "calves", label: "Calves", view: "front", x: 121, y: 323, w: 24, h: 74 },
  { slug: "back", label: "Back", view: "back", x: 442, y: 92, w: 58, h: 88 },
  { slug: "traps", label: "Traps", view: "back", x: 450, y: 64, w: 42, h: 38 },
  { slug: "triceps", label: "Triceps", view: "back", x: 514, y: 122, w: 24, h: 58 },
  { slug: "glutes", label: "Glutes", view: "back", x: 438, y: 204, w: 66, h: 50 },
  { slug: "hamstrings", label: "Hamstrings", view: "back", x: 438, y: 260, w: 30, h: 86 }
] as const;

export function WeeklyBodyMap({
  selectedSlug,
  volume,
  onSelect
}: {
  selectedSlug: string;
  volume: WeeklyVolumePayload;
  onSelect(slug: string): void;
}): ReactNode {
  const totals = currentWeekTotals(volume);
  const maxSets = Math.max(...[...totals.values()].map((item) => item.workingSets), 0);

  return (
    <div className="bodyMapWrap">
      <svg className="bodyMap" role="img" viewBox="0 0 640 430" aria-label="Weekly volume body map">
        <BodyOutline x={62} label="Front" />
        <BodyOutline x={372} label="Back" />
        {regions.map((region) => {
          const item = totals.get(region.slug);
          const fill = volumeColor(item?.workingSets ?? 0, maxSets);
          const isSelected = selectedSlug === region.slug;

          return (
            <g key={region.slug}>
              <rect
                aria-label={`${region.label}, ${item?.workingSets ?? 0} working sets`}
                className="muscleRegion"
                data-selected={isSelected}
                fill={fill}
                height={region.h}
                onClick={() => onSelect(region.slug)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(region.slug);
                  }
                }}
                role="button"
                rx="12"
                tabIndex={0}
                width={region.w}
                x={region.x}
                y={region.y}
              />
              <text className="bodyMapLabel" x={region.x + region.w / 2} y={region.y + region.h / 2 + 4}>
                {shortLabel(region.label)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function currentWeekTotals(volume: WeeklyVolumePayload): Map<string, WeeklyMuscleTotal> {
  const latestWeek = volume.weeks.at(-1);
  const totals = new Map<string, WeeklyMuscleTotal>();

  for (const item of latestWeek?.items ?? []) {
    totals.set(item.muscleGroup.slug, {
      muscleGroup: item.muscleGroup,
      workingSets: item.workingSets,
      exercises: item.exercises,
      recentSessions: item.recentSessions
    });
  }

  return totals;
}

export interface WeeklyMuscleTotal {
  muscleGroup: MuscleGroup;
  workingSets: number;
  exercises: WeeklyVolumePayload["weeks"][number]["items"][number]["exercises"];
  recentSessions: WeeklyVolumePayload["weeks"][number]["items"][number]["recentSessions"];
}

function BodyOutline({ x, label }: { x: number; label: string }): ReactNode {
  return (
    <g className="bodyOutline">
      <text x={x + 96} y="24">{label}</text>
      <ellipse cx={x + 96} cy="48" rx="20" ry="28" />
      <path d={`M ${x + 72} 80 L ${x + 120} 80 L ${x + 142} 202 L ${x + 118} 402 L ${x + 74} 402 L ${x + 50} 202 Z`} />
      <path d={`M ${x + 54} 98 L ${x + 20} 178 L ${x + 10} 260`} />
      <path d={`M ${x + 138} 98 L ${x + 172} 178 L ${x + 182} 260`} />
      <path d={`M ${x + 80} 402 L ${x + 74} 424`} />
      <path d={`M ${x + 112} 402 L ${x + 118} 424`} />
    </g>
  );
}

function volumeColor(sets: number, maxSets: number): string {
  if (sets <= 0 || maxSets <= 0) {
    return "#f7f4eb";
  }

  const ratio = sets / maxSets;

  if (ratio < 0.4) {
    return "#f6d96b";
  }

  if (ratio < 0.75) {
    return "#d94b36";
  }

  return "#4b145f";
}

function shortLabel(label: string): string {
  return label.length > 8 ? label.slice(0, 4) : label;
}
