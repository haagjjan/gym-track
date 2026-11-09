import type { ReactNode } from "react";

/** Stat tile (DESIGN.md, Data colors): sentence-case label, rounded numerals, unit beside the value. */
export function StatTile({ label, unit, value }: { label: string; unit?: string | undefined; value: ReactNode }): ReactNode {
  return (
    <div className="min-w-0">
      <dt className="text-subhead text-text-secondary">{label}</dt>
      <dd className="mt-0.5 flex items-baseline gap-1">
        <span className="num truncate text-title-2 text-text">{value}</span>
        {unit ? <span className="text-callout text-text-secondary">{unit}</span> : null}
      </dd>
    </div>
  );
}
