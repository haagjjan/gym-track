/** Default account heat ceiling before preferences load. */
export const HEAT_MAX_WEEKLY_SETS = 20;

export const HEAT_STAGE_COLORS = [
  "#7048c0",
  "#8a5ce6",
  "#a47cff",
  "#c2a6ff",
  "#e2d6ff"
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
  if (safeBucket === 5) return `Over ${formatRangeValue(lower)} sets a week`;
  if (safeBucket === 1) return `Up to ${formatRangeValue(upper)} sets a week`;
  return `Over ${formatRangeValue(lower)} to ${formatRangeValue(upper)} sets a week`;
}

function formatRangeValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function volumeRampCss(weeklySets: number, ceiling = HEAT_MAX_WEEKLY_SETS): string {
  const bucket = heatBucket(weeklySets, ceiling);
  return bucket === 0 ? "#2f353c" : HEAT_STAGE_COLORS[bucket - 1]!;
}

/** The shared figure faces +x; theta is measured from +z. */
export const FRONT_AZIMUTH = Math.PI / 2;

export interface FigureFrame {
  feetY: number;
  headY: number;
  halfWidth: number;
}
