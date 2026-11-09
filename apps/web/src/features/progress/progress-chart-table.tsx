import type { ReactNode } from "react";
import type { ChartRow } from "./progress-chart-data";
import type { ChartMode } from "./progress-selection";

/** The chart's data as a real table, newest first. */
export function ProgressChartTable({ mode, rows, showReps, showWeight }: { mode: ChartMode; rows: ChartRow[]; showReps: boolean; showWeight: boolean }): ReactNode {
  const ordered = [...rows].reverse();
  const columns = mode === "estimated"
    ? [{ key: "est1rm", label: "Est. 1RM (kg)" }]
    : [...(showWeight ? [{ key: "weight", label: "Weight (kg)" }] : []), ...(showReps ? [{ key: "reps", label: "Reps" }] : [])];

  return (
    <div className="max-h-[22rem] overflow-auto">
      <table className="w-full text-left text-callout">
        <caption className="sr-only">Plotted sets, newest first</caption>
        <thead>
          <tr className="text-footnote text-text-secondary">
            <th className="py-2 pr-3 font-normal" scope="col">Date</th>
            {columns.map((column) => <th className="px-3 py-2 text-right font-normal" key={column.key} scope="col">{column.label}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {ordered.map((row) => (
            <tr className="min-h-11" key={row.date}>
              <th className="py-3 pr-3 font-normal text-text" scope="row">{row.label}</th>
              {columns.map((column) => <td className="num px-3 py-3 text-right text-text" key={column.key}>{row[column.key as "weight" | "reps" | "est1rm"]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
