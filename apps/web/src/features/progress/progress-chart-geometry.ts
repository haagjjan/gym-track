import type { ChartRow } from "./progress-chart-data";

/** The plotted day closest to a tap, from its x position on the time axis. */
export function nearestRow(
  rows: ChartRow[],
  x: number,
  { domainMax, domainMin, plotLeft, plotWidth }: { domainMax: number; domainMin: number; plotLeft: number; plotWidth: number }
): ChartRow | undefined {
  if (rows.length === 0 || plotWidth <= 0) return undefined;
  const time = domainMin + ((x - plotLeft) / plotWidth) * Math.max(domainMax - domainMin, 1);
  let best = rows[0]!;
  for (const row of rows) if (Math.abs(row.time - time) < Math.abs(best.time - time)) best = row;
  return best;
}
