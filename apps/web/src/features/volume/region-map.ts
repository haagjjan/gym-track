import * as THREE from "three";
import { FRONT_X_SIGN } from "./heatmap";
import {
  frontBackMapU,
  shouldUseSideMap,
  sideCoverageAllowed,
  sideMapU,
  SIDE_COVERAGE_ALPHA,
  type RegionProjectionPoint
} from "./region-projection";

/**
 * Hand-authored front/back maps plus a sparse side override are shared by the
 * projection shader and click-picking, so rendering and selection use one
 * pixel source.
 *
 * Coordinate convention (the one source of truth — shader and CPU mirror it):
 * - `yn` ∈ [0,1]: 0 at the feet line, 1 at the head top (measureFigureFrame).
 * - `xn` = worldX / frame.halfWidth, front/back depth for the side map.
 * - `zn` = worldZ / frame.halfWidth, lateral axis; maps span ±MAP_LATERAL_RANGE.
 * - FRONT image left = world +z; BACK image left = world −z.
 * - SIDE is authored from +z and mirrored for -z.
 * - SVG y grows downward: y=0 is the head.
 *
 * Region ids use a non-collinear color palette. Anti-aliased blends therefore
 * fall outside the decode tolerance and fail closed into region 0 instead of
 * accidentally matching a third region.
 */

export const MAP_LATERAL_RANGE = 1.15;
/** halfWidth = 0.28 × figureHeight (measureFigureFrame) → map aspect w/h. */
export const MAP_ASPECT = 2 * MAP_LATERAL_RANGE * 0.28;
export const MAP_HEIGHT_PX = 2048;
export const MAP_WIDTH_PX = Math.round(MAP_HEIGHT_PX * MAP_ASPECT);

export const FRONT_MAP_URL = "/volume/muscle-regions-front.svg";
export const BACK_MAP_URL = "/volume/muscle-regions-back.svg";
export const SIDE_MAP_URL = "/volume/muscle-regions-side.svg";

/**
 * Palette by region id (REGION_SLUGS order). Chosen for spread: min pairwise
 * distance ≈128, and no entry sits near the segment between two others.
 */
export const REGION_PALETTE: readonly [number, number, number][] = [
  [0, 0, 0], // none / gaps / background
  [255, 0, 0], // chest
  [0, 255, 0], // back
  [0, 0, 255], // traps
  [255, 255, 0], // shoulders
  [255, 0, 255], // biceps
  [0, 255, 255], // triceps
  [255, 128, 0], // forearms
  [128, 0, 255], // abs
  [128, 255, 0], // glutes
  [255, 0, 128], // quads
  [0, 128, 255], // hamstrings
  [255, 255, 255] // calves
];

/** Blend texels farther than this from every entry decode to 0 (squared). */
export const REGION_DECODE_MAX_DISTANCE_SQ = 60 * 60;

/** SVG fill color that encodes a region id. */
export function regionFill(regionId: number): string {
  const [r, g, b] = REGION_PALETTE[regionId] ?? [0, 0, 0];

  return `rgb(${r},${g},${b})`;
}

export interface RegionMaps {
  frontTexture: THREE.CanvasTexture;
  backTexture: THREE.CanvasTexture;
  sideTexture: THREE.CanvasTexture;
  /** Pixel-exact lookup mirroring the shader's dominant-normal projection. */
  getRegionAt: (point: RegionProjectionPoint) => number;
  /** Re-fetch + re-rasterize the SVGs in place (art iteration, spike only). */
  reload: () => Promise<void>;
  /** Resolves after the initial rasterization; textures are blank before. */
  ready: Promise<void>;
}

interface MapSide {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  pixels: ImageData | null;
}

function createSide(): MapSide {
  const canvas = document.createElement("canvas");
  canvas.width = MAP_WIDTH_PX;
  canvas.height = MAP_HEIGHT_PX;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  if (!ctx) {
    throw new Error("2d canvas unavailable for region maps");
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.NoColorSpace;

  return { canvas, ctx, texture, pixels: null };
}

async function rasterize(side: MapSide, url: string, opaqueBackground: boolean): Promise<void> {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`region map fetch failed: ${url} (${response.status})`);
  }

  const svgText = await response.text();
  const blob = new Blob([svgText], { type: "image/svg+xml" });
  const objectUrl = URL.createObjectURL(blob);

  try {
    const image = new Image();

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(`region map decode failed: ${url}`));
      image.src = objectUrl;
    });

    side.ctx.clearRect(0, 0, MAP_WIDTH_PX, MAP_HEIGHT_PX);

    if (opaqueBackground) {
      // Front/back own their full projection; black encodes neutral region 0.
      side.ctx.fillStyle = regionFill(0);
      side.ctx.fillRect(0, 0, MAP_WIDTH_PX, MAP_HEIGHT_PX);
    }

    // The side map intentionally keeps its unpainted pixels transparent so it
    // can override only anatomy that needs a side projection. Opaque black in
    // that SVG remains an explicit neutral/erase instruction.
    side.ctx.drawImage(image, 0, 0, MAP_WIDTH_PX, MAP_HEIGHT_PX);
    side.pixels = side.ctx.getImageData(0, 0, MAP_WIDTH_PX, MAP_HEIGHT_PX);
    side.texture.needsUpdate = true;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Decode a pixel to a region id: nearest palette entry, or 0 when the pixel
 * is a rasterization blend far from every entry. Mirrors the GLSL decode in
 * muscle-mask-material.ts — keep in lockstep.
 */
function decodePixel(
  pixels: ImageData,
  x: number,
  y: number
): { covered: boolean; region: number } {
  const clampedX = Math.min(Math.max(x, 0), pixels.width - 1);
  const clampedY = Math.min(Math.max(y, 0), pixels.height - 1);
  const offset = (clampedY * pixels.width + clampedX) * 4;
  const r = pixels.data[offset] ?? 0;
  const g = pixels.data[offset + 1] ?? 0;
  const b = pixels.data[offset + 2] ?? 0;
  const alpha = (pixels.data[offset + 3] ?? 0) / 255;

  let best = 0;
  let bestDistance = Infinity;

  for (let region = 0; region < REGION_PALETTE.length; region += 1) {
    const entry = REGION_PALETTE[region];

    if (!entry) {
      continue;
    }

    const distance =
      (r - entry[0]) * (r - entry[0]) +
      (g - entry[1]) * (g - entry[1]) +
      (b - entry[2]) * (b - entry[2]);

    if (distance < bestDistance) {
      bestDistance = distance;
      best = region;
    }
  }

  return {
    covered: alpha > SIDE_COVERAGE_ALPHA,
    region: bestDistance <= REGION_DECODE_MAX_DISTANCE_SQ ? best : 0
  };
}

let singleton: RegionMaps | null = null;

/**
 * Synchronous singleton; browser-only (call from client components/handlers).
 * Textures exist immediately (blank canvases decode to region 0 via the
 * checksum, so the body simply renders untrained until the maps arrive).
 */
export function getRegionMaps(): RegionMaps {
  if (singleton) {
    return singleton;
  }

  const front = createSide();
  const back = createSide();
  const side = createSide();

  const reload = async (): Promise<void> => {
    await Promise.all([
      rasterize(front, FRONT_MAP_URL, true),
      rasterize(back, BACK_MAP_URL, true),
      rasterize(side, SIDE_MAP_URL, false)
    ]);
  };

  singleton = {
    frontTexture: front.texture,
    backTexture: back.texture,
    sideTexture: side.texture,
    getRegionAt: ({ xn, zn, yn, nx, nz }) => {
      const facingFront = nx * FRONT_X_SIGN >= 0;
      const frontBack = facingFront ? front : back;

      // FRONT: image left→right = world +z→−z; BACK mirrors.
      const frontBackX = Math.floor(
        frontBackMapU(zn, facingFront, MAP_LATERAL_RANGE) * MAP_WIDTH_PX
      );
      const y = Math.floor((1 - yn) * MAP_HEIGHT_PX);
      const baseRegion = frontBack.pixels
        ? decodePixel(frontBack.pixels, frontBackX, y).region
        : 0;

      if (!side.pixels) {
        return baseRegion;
      }

      // +z is the authored side view; -z mirrors it around the figure.
      const sideX = Math.floor(sideMapU(xn, nz, MAP_LATERAL_RANGE) * MAP_WIDTH_PX);
      const sidePixel = decodePixel(side.pixels, sideX, y);

      const sideCovered = sidePixel.covered && sideCoverageAllowed(yn, zn, sidePixel.region);

      return shouldUseSideMap(nx, nz, sideCovered) ? sidePixel.region : baseRegion;
    },
    reload,
    ready: reload()
  };

  return singleton;
}
