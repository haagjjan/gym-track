import type { ReactNode } from "react";
import type {
  ExerciseProgressItem,
  ExerciseSummaryPayload,
  WeeklyVolumePayload
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

export function ProgressChart({ items }: { items: ExerciseProgressItem[] }): ReactNode {
  const maxEstimate = Math.max(...items.map((item) => Number(item.estimatedOneRepMaxKg)), 0);

  if (items.length === 0) {
    return <p className="mutedText">No working sets in this range.</p>;
  }

  return (
    <div className="progressChart" aria-label="Estimated one rep max trend">
      {items.map((item) => (
        <div className="progressBarRow" key={item.setId}>
          <span>{shortDate(item.sessionDate)}</span>
          <div className="progressTrack">
            <span style={{ width: `${barPercent(Number(item.estimatedOneRepMaxKg), maxEstimate)}%` }} />
          </div>
          <strong>{item.estimatedOneRepMaxKg} kg</strong>
        </div>
      ))}
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

export function WeeklyVolumeChart({ volume }: { volume: WeeklyVolumePayload }): ReactNode {
  const maxSets = Math.max(
    ...volume.weeks.flatMap((week) => week.items.map((item) => item.workingSets)),
    0
  );

  if (volume.weeks.length === 0) {
    return <p className="mutedText">No working sets in this range.</p>;
  }

  return (
    <div className="weeklyVolumeList">
      {volume.weeks.map((week) => (
        <article className="weeklyVolumeWeek" key={week.weekStart}>
          <h3>
            {week.weekStart} to {week.weekEnd}
          </h3>
          {week.items.map((item) => (
            <div className="volumeBarRow" key={`${week.weekStart}-${item.muscleGroup.id}`}>
              <span>{item.muscleGroup.name}</span>
              <div className="progressTrack">
                <span style={{ width: `${barPercent(item.workingSets, maxSets)}%` }} />
              </div>
              <strong>{item.workingSets}</strong>
            </div>
          ))}
        </article>
      ))}
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

function barPercent(value: number, max: number): number {
  if (max <= 0) {
    return 0;
  }

  return Math.max(4, Math.round((value / max) * 100));
}
