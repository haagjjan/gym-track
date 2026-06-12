"use client";

import type { ReactNode } from "react";
import {
  volumeBand,
  volumeBandLabel,
  type VolumeBand,
  type VolumeMuscleTotal
} from "./volume-analytics";
import {
  anatomyLines,
  bodyOutlinePaths,
  muscleMapRegions
} from "./weekly-body-map-regions";

export function WeeklyBodyMap({
  selectedSlug,
  totals,
  onSelect
}: {
  selectedSlug: string;
  totals: Map<string, VolumeMuscleTotal>;
  onSelect(slug: string): void;
}): ReactNode {
  return (
    <div className="volumeBodyMapWrap">
      <svg className="bodyMap" role="img" viewBox="0 0 760 560" aria-label="Weekly volume body map">
        <text className="bodyFigureLabel" x="200" y="24">Front</text>
        <text className="bodyFigureLabel" x="560" y="24">Back</text>
        {bodyOutlinePaths.map((path) => (
          <path className="bodyOutline" d={path} key={path} />
        ))}
        {muscleMapRegions.map((region) => {
          const item = totals.get(region.slug);
          const band = volumeBand(item?.weeklyAverageSets ?? 0);
          const isSelected = selectedSlug === region.slug;

          return (
            <g
              aria-label={`${region.label}, ${item?.workingSets ?? 0} working sets, ${volumeBandLabel(band)}`}
              className="muscleRegionGroup"
              data-band={band}
              data-active={(item?.workingSets ?? 0) > 0}
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
                  fill={volumeFill(band)}
                  key={path}
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

function volumeFill(band: VolumeBand): string {
  if (band === "high") {
    return "rgba(217, 185, 255, 0.78)";
  }

  if (band === "active") {
    return "rgba(81, 251, 55, 0.58)";
  }

  if (band === "maintenance") {
    return "rgba(0, 219, 231, 0.42)";
  }

  return "rgba(18, 28, 30, 0.92)";
}
