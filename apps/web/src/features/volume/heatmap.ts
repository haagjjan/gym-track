import * as THREE from "three";

/**
 * Shared muscle-volume constants and figure normalization.
 *
 * Region assignment now lives in the projected ID maps (region-map.ts +
 * muscle-mask-material.ts), not per-vertex classification. This module keeps
 * the region vocabulary, the sets→heat buckets, the five-stage purple display scale
 * (single-sourced with the shader), and the figure frame both the shader and
 * picking normalize against.
 */

/** Index 0 is "unclassified" (untrained / neutral). */
export const REGION_SLUGS = [
  "none",
  "chest",
  "back",
  "traps",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "abs",
  "glutes",
  "quads",
  "hamstrings",
  "calves"
] as const;

export type RegionSlug = (typeof REGION_SLUGS)[number];

export const regionIndexBySlug = new Map<string, number>(
  REGION_SLUGS.map((slug, index) => [slug, index])
);

/** Default account heat ceiling before preferences load. */
export const HEAT_MAX_WEEKLY_SETS = 20;

/** Weekly sets used by the internal anatomy-debug target marker. */
export const TARGET_WEEKLY_SETS = 10;

export const HEAT_STAGE_COLORS = [
  "#E9D5FF",
  "#D8B4FE",
  "#C084FC",
  "#9333EA",
  "#581C87"
] as const;

export function heatBucket(weeklySets: number, ceiling = HEAT_MAX_WEEKLY_SETS): number {
  if (weeklySets <= 0) return 0;
  return Math.ceil(Math.min(weeklySets / Math.max(ceiling, 1), 1) * 5);
}

export function heatBarWidth(weeklySets: number, ceiling = HEAT_MAX_WEEKLY_SETS): number {
  return Math.min(Math.max(weeklySets / Math.max(ceiling, 1), 0), 1) * 100;
}

export function heatRangeLabel(bucket: number, ceiling = HEAT_MAX_WEEKLY_SETS): string {
  const safeBucket = Math.min(Math.max(Math.round(bucket), 1), 5);
  const lower = ((safeBucket - 1) * ceiling) / 5;
  const upper = (safeBucket * ceiling) / 5;
  if (safeBucket === 5) return `>${formatRangeValue(lower)} sets / WK (${formatRangeValue(ceiling)}+ stays at max heat)`;
  const range = safeBucket === 1 ? `>0–${formatRangeValue(upper)}` : `>${formatRangeValue(lower)}–${formatRangeValue(upper)}`;
  return `${range} sets / WK`;
}

function formatRangeValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** Shader-safe bucket value: 0, .2, .4, .6, .8, or 1. */
export function heatT(weeklySets: number, ceiling = HEAT_MAX_WEEKLY_SETS): number {
  return heatBucket(weeklySets, ceiling) / 5;
}

export function volumeRampCss(weeklySets: number, ceiling = HEAT_MAX_WEEKLY_SETS): string {
  const bucket = heatBucket(weeklySets, ceiling);
  return bucket === 0 ? "#2f353c" : HEAT_STAGE_COLORS[bucket - 1]!;
}

export function volumeRampRgb(weeklySets: number, ceiling = HEAT_MAX_WEEKLY_SETS): [number, number, number] {
  const hex = volumeRampCss(weeklySets, ceiling).slice(1);
  return [Number.parseInt(hex.slice(0, 2), 16), Number.parseInt(hex.slice(2, 4), 16), Number.parseInt(hex.slice(4, 6), 16)];
}

/**
 * The FBX renders a **front-double-biceps flex** pose (arms up beside the head),
 * facing +x — so x is the front/back axis and z is the lateral (arm) axis.
 * Flip the sign if the asset ever changes.
 */
export const FRONT_X_SIGN = 1;

/** Camera azimuth that looks at the figure's chest (theta = atan2(x, z)). */
export const FRONT_AZIMUTH = (FRONT_X_SIGN * Math.PI) / 2;

export interface FigureFrame {
  feetY: number;
  headY: number;
  halfWidth: number;
}

/**
 * The statue includes its pedestal; find the feet line by scanning horizontal
 * extent per height slice — pedestal slices are much wider than leg slices.
 * The projection shader and click-picking both normalize against this frame.
 */
export function measureFigureFrame(root: THREE.Object3D): FigureFrame {
  const bounds = new THREE.Box3().setFromObject(root);
  const totalHeight = bounds.max.y - bounds.min.y;
  const bins = 120;
  const extent = new Float32Array(bins);
  const vertex = new THREE.Vector3();

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    const position = child.geometry.getAttribute("position");

    if (!position) {
      return;
    }

    for (let index = 0; index < position.count; index += 1) {
      vertex.fromBufferAttribute(position, index).applyMatrix4(child.matrixWorld);

      const bin = Math.min(
        bins - 1,
        Math.max(0, Math.floor(((vertex.y - bounds.min.y) / totalHeight) * bins))
      );
      const radial = Math.max(Math.abs(vertex.x), Math.abs(vertex.z));

      if (radial > (extent[bin] ?? 0)) {
        extent[bin] = radial;
      }
    }
  });

  // Walk DOWN from the waist: the first slice that balloons well past the
  // waist width is the pedestal's top disc. Relative to the waist (not the
  // global max) so the pedestal's wide slab can't skew the threshold.
  const waistBin = Math.floor(bins * 0.55);
  const waistExtent = Math.max(extent[waistBin] ?? 0, 0.01);
  const discThreshold = waistExtent * 2.2;
  let feetBin = 0;

  for (let bin = waistBin; bin >= 0; bin -= 1) {
    if ((extent[bin] ?? 0) > discThreshold) {
      feetBin = bin + 1;
      break;
    }
  }

  const feetY = bounds.min.y + (feetBin / bins) * totalHeight;
  const figureHeight = bounds.max.y - feetY;

  return {
    feetY,
    headY: bounds.max.y,
    halfWidth: figureHeight * 0.28
  };
}
