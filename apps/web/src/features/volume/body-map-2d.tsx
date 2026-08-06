"use client";

import { useEffect, useState, type ReactNode } from "react";
import { volumeRampCss, type RegionSlug } from "./heatmap";
import { BACK_MAP_URL, FRONT_MAP_URL } from "./region-map";

/**
 * Flat front/back muscle map — the same authored SVGs that drive the 3D body
 * (region-map.ts), rendered directly and recolored by weekly volume. Precise
 * by construction (it IS the art) and cheap (no WebGL), so it doubles as the
 * user-selectable low-power / at-a-glance alternative to the default 3D view.
 * Trained muscles take the cyan → violet ramp; untrained stay slate; the selected
 * group is outlined in lavender.
 */

const UNTRAINED = "#2f353c";
const SELECT_STROKE = "#d9b9ff";

interface PathSpec {
  region: RegionSlug;
  d: string;
}

interface RegionArt {
  width: number;
  height: number;
  front: PathSpec[];
  back: PathSpec[];
}

let artPromise: Promise<RegionArt> | null = null;

function parseSide(text: string, groupId: string): PathSpec[] {
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const group = doc.getElementById(groupId);

  if (!group) {
    return [];
  }

  return [...group.querySelectorAll("path[data-region]")].map((path) => ({
    region: (path.getAttribute("data-region") ?? "none") as RegionSlug,
    d: path.getAttribute("d") ?? ""
  }));
}

function loadRegionArt(): Promise<RegionArt> {
  if (!artPromise) {
    artPromise = (async () => {
      const [frontText, backText] = await Promise.all([
        fetch(FRONT_MAP_URL).then((response) => response.text()),
        fetch(BACK_MAP_URL).then((response) => response.text())
      ]);

      const viewBox =
        new DOMParser()
          .parseFromString(frontText, "image/svg+xml")
          .querySelector("svg")
          ?.getAttribute("viewBox")
          ?.split(/\s+/)
          .map(Number) ?? [0, 0, 660, 1024];

      return {
        width: viewBox[2] ?? 660,
        height: viewBox[3] ?? 1024,
        front: parseSide(frontText, "front-left"),
        back: parseSide(backText, "back-left")
      };
    })();
  }

  return artPromise;
}

export interface BodyMap2DProps {
  weeklySetsBySlug: Record<string, number>;
  selectedSlug: string | null;
  onSelect: (slug: RegionSlug | null) => void;
  heatCeiling: number;
}

export function BodyMap2D({
  weeklySetsBySlug,
  selectedSlug,
  onSelect,
  heatCeiling
}: BodyMap2DProps): ReactNode {
  const [art, setArt] = useState<RegionArt | null>(null);

  useEffect(() => {
    let active = true;

    void loadRegionArt().then((loaded) => {
      if (active) {
        setArt(loaded);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  if (!art) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="label-caps animate-pulse-slow text-cyan-dim">LOADING_BODY_MAP</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-stretch justify-center gap-2 sm:gap-6">
      <BodyMapSide
        art={art}
        heatCeiling={heatCeiling}
        label="FRONT"
        onSelect={onSelect}
        paths={art.front}
        selectedSlug={selectedSlug}
        weeklySetsBySlug={weeklySetsBySlug}
      />
      <BodyMapSide
        art={art}
        heatCeiling={heatCeiling}
        label="BACK"
        onSelect={onSelect}
        paths={art.back}
        selectedSlug={selectedSlug}
        weeklySetsBySlug={weeklySetsBySlug}
      />
    </div>
  );
}

function BodyMapSide({
  art,
  label,
  paths,
  weeklySetsBySlug,
  selectedSlug,
  onSelect,
  heatCeiling
}: {
  art: RegionArt;
  label: string;
  paths: PathSpec[];
  weeklySetsBySlug: Record<string, number>;
  selectedSlug: string | null;
  onSelect: (slug: RegionSlug | null) => void;
  heatCeiling: number;
}): ReactNode {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center">
      <svg
        aria-label={`${label} muscle map`}
        className="min-h-0 w-full flex-1"
        preserveAspectRatio="xMidYMid meet"
        role="group"
        viewBox={`0 0 ${art.width} ${art.height}`}
      >
        {/* Left-authored halves, then their mirror, so both sides stay clickable. */}
        <RegionPaths
          heatCeiling={heatCeiling}
          onSelect={onSelect}
          paths={paths}
          selectedSlug={selectedSlug}
          weeklySetsBySlug={weeklySetsBySlug}
        />
        <g transform={`translate(${art.width},0) scale(-1,1)`}>
          <RegionPaths
            heatCeiling={heatCeiling}
            onSelect={onSelect}
            paths={paths}
            selectedSlug={selectedSlug}
            weeklySetsBySlug={weeklySetsBySlug}
          />
        </g>
      </svg>
      <p className="label-caps mt-1 text-outline">{label}</p>
    </div>
  );
}

function RegionPaths({
  paths,
  weeklySetsBySlug,
  selectedSlug,
  onSelect,
  heatCeiling
}: {
  paths: PathSpec[];
  weeklySetsBySlug: Record<string, number>;
  selectedSlug: string | null;
  onSelect: (slug: RegionSlug | null) => void;
  heatCeiling: number;
}): ReactNode {
  return (
    <>
      {paths.map((path, index) => {
        const sets = weeklySetsBySlug[path.region] ?? 0;
        const isSelected = path.region === selectedSlug;

        return (
          <path
            aria-label={path.region}
            className="cursor-pointer transition-[fill] duration-300"
            d={path.d}
            fill={sets > 0 ? volumeRampCss(sets, heatCeiling) : UNTRAINED}
            key={`${path.region}-${index}`}
            onClick={() => onSelect(path.region)}
            stroke={isSelected ? SELECT_STROKE : "#0a0a0a"}
            strokeWidth={isSelected ? 7 : 3}
          />
        );
      })}
    </>
  );
}
