/**
 * Shared CPU/GPU projection rules for the Volume muscle maps.
 *
 * The front/back maps project world z across the image. The sparse side map is
 * authored from +z, so its image runs world -x → +x; -z-facing fragments
 * mirror that lookup. Keep the exported thresholds in lockstep with the shader
 * constants interpolated by muscle-mask-material.ts.
 */

export const SIDE_COVERAGE_ALPHA = 0.5;
export const SIDE_BLEND_START = 0.4;
export const SIDE_BLEND_END = 0.6;
export const PROJECTION_EPSILON = 0.000001;
/** Prevent side-authored raised arms from projecting onto the overlapping head. */
export const SIDE_ARM_GATE_MIN_YN = 0.75;
export const SIDE_ARM_GATE_MIN_ABS_ZN = 0.52;
export const SIDE_SHOULDER_MAX_ABS_ZN = 0.7;
export const SIDE_FOREARM_MIN_ABS_ZN = 0.9;
export const SIDE_SHOULDER_REGION_ID = 4;
export const SIDE_FOREARM_REGION_ID = 7;

export interface RegionProjectionPoint {
  /** Normalized front/back position: world x / figure half-width. */
  xn: number;
  /** Normalized lateral position: world z / figure half-width. */
  zn: number;
  /** Normalized height: feet = 0, head = 1. */
  yn: number;
  /** World-space smooth surface normal, front/back component. */
  nx: number;
  /** World-space smooth surface normal, side component. */
  nz: number;
}

export function frontBackMapU(zn: number, facingFront: boolean, range: number): number {
  return facingFront ? (range - zn) / (2 * range) : (zn + range) / (2 * range);
}

export function sideMapU(xn: number, nz: number, range: number): number {
  return nz >= 0 ? (xn + range) / (2 * range) : (range - xn) / (2 * range);
}

export function sideDominance(nx: number, nz: number): number {
  const total = Math.abs(nx) + Math.abs(nz);

  return Math.abs(nz) / Math.max(total, PROJECTION_EPSILON);
}

export function shouldUseSideMap(nx: number, nz: number, sideCovered: boolean): boolean {
  return sideCovered && Math.abs(nz) > Math.abs(nx);
}

export function sideCoverageAllowed(yn: number, zn: number, sideRegion: number): boolean {
  if (yn < SIDE_ARM_GATE_MIN_YN) {
    return true;
  }

  const absZn = Math.abs(zn);

  if (absZn < SIDE_ARM_GATE_MIN_ABS_ZN) {
    return false;
  }

  // The flexed pose overlaps shoulder and forearm pixels in the exact side
  // projection. Their world-lateral distance separates them reliably: delts
  // sit closer to the torso while the raised forearms occupy the outer shell.
  if (sideRegion === SIDE_SHOULDER_REGION_ID) {
    return absZn <= SIDE_SHOULDER_MAX_ABS_ZN;
  }

  if (sideRegion === SIDE_FOREARM_REGION_ID) {
    return absZn >= SIDE_FOREARM_MIN_ABS_ZN;
  }

  return true;
}
