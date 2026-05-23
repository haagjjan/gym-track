"use client";

import type { ReactNode } from "react";
import type { MuscleGroup, WeeklyVolumePayload } from "./analytics-types";
import {
  anatomyLines,
  bodyOutlinePaths,
  findMuscleMapRegion,
  muscleMapRegions
} from "./weekly-body-map-regions";

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
      <svg className="bodyMap" role="img" viewBox="0 0 760 560" aria-label="Weekly volume body map">
        <text className="bodyFigureLabel" x="200" y="24">Front</text>
        <text className="bodyFigureLabel" x="560" y="24">Back</text>
        {bodyOutlinePaths.map((path) => (
          <path className="bodyOutline" d={path} key={path} />
        ))}
        {muscleMapRegions.map((region) => {
          const item = totals.get(region.slug);
          const fill = volumeColor(item?.workingSets ?? 0, maxSets);
          const isSelected = selectedSlug === region.slug;

          return (
            <g
              aria-label={`${region.label}, ${item?.workingSets ?? 0} working sets`}
              className="muscleRegionGroup"
              data-selected={isSelected}
              key={region.slug}
              onClick={() => onSelect(region.slug)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(region.slug);
                }
              }}
              role="button"
              tabIndex={0}
            >
              {region.parts.map((path) => (
                <path
                  className="muscleRegion"
                  d={path}
                  key={path}
                  fill={fill}
                />
              ))}
            </g>
          );
        })}
        {anatomyLines.map((path) => (
          <path className="anatomyLine" d={path} key={path} />
        ))}
      </svg>
    </div>
  );
}

export function selectedWeeklyMuscle(
  volume: WeeklyVolumePayload,
  selectedSlug: string
): WeeklyMuscleTotal | null {
  const totals = currentWeekTotals(volume);
  const selected = totals.get(selectedSlug);
  const selectedRegion = findMuscleMapRegion(selectedSlug);

  if (selected) {
    return selected;
  }

  if (selectedRegion) {
    return {
      muscleGroup: {
        id: selectedRegion.slug,
        slug: selectedRegion.slug,
        name: selectedRegion.label
      },
      workingSets: 0,
      exercises: [],
      recentSessions: []
    };
  }

  return totals.values().next().value ?? null;
}

export function firstMuscleSlug(volume: WeeklyVolumePayload): string {
  return volume.weeks.at(-1)?.items[0]?.muscleGroup.slug ?? "chest";
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
