import type { ReactNode } from "react";
import type {
  ExerciseProgressItem,
  ExerciseSummaryPayload
} from "./analytics-types";

export function ExerciseSummary({ summary }: { summary: ExerciseSummaryPayload }): ReactNode {
  return (
    <div className="analyticsMetrics" aria-label="Exercise summary">
      <Metric label="Sets" value={summary.totalSets.toString()} />
      <Metric label="Reps" value={summary.totalReps.toString()} />
      <Metric label="Volume" value={`${summary.totalVolumeKg} kg`} />
      <Metric label="Avg RIR" value={summary.averageRir?.toString() ?? "None"} />
      <Metric
        label="Best set"
        value={
          summary.bestTopSet
            ? `${summary.bestTopSet.weightKg} kg x ${summary.bestTopSet.reps}`
            : "None"
        }
      />
    </div>
  );
}

export function ProgressTable({ items }: { items: ExerciseProgressItem[] }): ReactNode {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="analyticsTableWrap">
      <table className="analyticsTable">
        <thead>
          <tr>
            <th>Date</th>
            <th>Set</th>
            <th>Weight</th>
            <th>Reps</th>
            <th>RIR</th>
            <th>Est. 1RM</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.setId}>
              <td>{shortDate(item.sessionDate)}</td>
              <td>{item.setOrder}</td>
              <td>{item.weightKg} kg</td>
              <td>{item.reps}</td>
              <td>{item.rir}</td>
              <td>{item.estimatedOneRepMaxKg} kg</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <div className="analyticsMetric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function shortDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}
