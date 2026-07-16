import Link from "next/link";
import type { ReactNode } from "react";
import type {
  ExerciseProgressItem,
  ExerciseSummaryPayload
} from "./analytics-types";
import {
  handleProgressPointerLeave,
  handleProgressPointerMove
} from "./progress-pointer";
import { exportProgressCsv } from "./progress-export";
import {
  compareProgressAsc,
  compareProgressDesc,
  formatProgressWeight,
  shortSetDate
} from "./progress-items";

export function ExerciseSummary({
  isLoading,
  items,
  selectedWindowLabel,
  summary
}: {
  isLoading: boolean;
  items: ExerciseProgressItem[];
  selectedWindowLabel: string;
  summary: ExerciseSummaryPayload | null;
}): ReactNode {
  if (isLoading) {
    return (
      <div className="progressMetricDeck" aria-label="Exercise summary loading">
        {["Sets", "Avg reps", "Best set", "Est. 1RM"].map((label) => (
          <Metric detail="Synchronizing set stream." key={label} label={label} value="..." />
        ))}
      </div>
    );
  }

  if (!summary) {
    return <ProgressEmptyState title="SELECT_EXERCISE" message="Choose a logged exercise to load its progress signals." />;
  }

  const averageReps = summary.totalSets > 0 ? summary.totalReps / summary.totalSets : null;
  const bestSet = summary.bestTopSet;

  return (
    <div className="progressMetricDeck" aria-label="Exercise summary">
      <Metric
        detail={`${summary.totalReps} reps in ${selectedWindowLabel}`}
        label="Total sets"
        tone="cyan"
        value={summary.totalSets.toString()}
      />
      <Metric
        detail={summary.totalSets > 0 ? "Average reps per logged set." : "No working sets in range."}
        label="Average reps"
        tone="green"
        value={averageReps === null ? "None" : averageReps.toFixed(1)}
      />
      <Metric
        label="Best set"
        detail={bestSet ? shortSetDate(bestSet.sessionDate) : "No best set available."}
        tone="lavender"
        value={bestSet ? `${formatProgressWeight(bestSet.weightKg)} x ${bestSet.reps}` : "None"}
      />
      <Metric
        detail={strengthDetail(items)}
        label="Estimated 1RM"
        tone="cyan"
        value={bestSet ? `${formatProgressWeight(bestSet.estimatedOneRepMaxKg)}` : "None"}
      />
    </div>
  );
}

export function ProgressRecentLogs({
  exerciseName,
  items,
  selectedWindowLabel
}: {
  exerciseName: string;
  items: ExerciseProgressItem[];
  selectedWindowLabel: string;
}): ReactNode {
  if (items.length === 0) {
    return (
      <section className="progressLogPanel progressReactive" aria-labelledby="progress-log-title">
        <div className="progressSectionHeader">
          <div>
            <p className="eyebrow">Recent set logs</p>
            <h2 id="progress-log-title">No working sets in range</h2>
          </div>
        </div>
        <ProgressEmptyState
          title="NO_SET_TELEMETRY"
          message="Try MAX, select another exercise, or log working sets to build the timeline."
        />
      </section>
    );
  }

  const recentItems = [...items].sort(compareProgressDesc).slice(0, 10);

  return (
    <section className="progressLogPanel progressReactive" aria-labelledby="progress-log-title">
      <div className="progressSectionHeader">
        <div>
          <p className="eyebrow">Recent set logs</p>
          <h2 id="progress-log-title">{recentItems.length} latest signals</h2>
        </div>
        <button
          className="progressGhostButton"
          onClick={() => exportProgressCsv(items, exerciseName, selectedWindowLabel)}
          type="button"
        >
          EXPORT_RAW_CSV
        </button>
      </div>
      <div className="progressSetLogGrid">
        {recentItems.map((item) => (
          <article
            className="progressSetLogCard"
            key={item.setId}
            onPointerLeave={handleProgressPointerLeave}
            onPointerMove={handleProgressPointerMove}
          >
            <div>
              <span>{shortSetDate(item.sessionDate)}</span>
              <strong>{formatProgressWeight(item.weightKg)} x {item.reps}</strong>
            </div>
            <dl>
              <div>
                <dt>Set</dt>
                <dd>{item.setOrder}</dd>
              </div>
              <div>
                <dt>RIR</dt>
                <dd>{item.rir}</dd>
              </div>
              <div>
                <dt>Est. 1RM</dt>
                <dd>{formatProgressWeight(item.estimatedOneRepMaxKg)}</dd>
              </div>
            </dl>
            <Link href={`/workouts/${item.workoutId}`}>OPEN_SESSION</Link>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ProgressEmptyState({
  message,
  title
}: {
  message: string;
  title: string;
}): ReactNode {
  return (
    <div className="progressEmptyState">
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  );
}

function Metric({
  detail,
  label,
  tone = "cyan",
  value
}: {
  detail: string;
  label: string;
  tone?: "cyan" | "green" | "lavender";
  value: string;
}): ReactNode {
  return (
    <div
      className="progressMetricCard"
      data-tone={tone}
      onPointerLeave={handleProgressPointerLeave}
      onPointerMove={handleProgressPointerMove}
    >
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </div>
  );
}

function strengthDetail(items: ExerciseProgressItem[]): string {
  const sortedItems = [...items].sort(compareProgressAsc);
  const first = sortedItems[0];
  const latest = sortedItems.at(-1);

  if (!first || !latest || first.setId === latest.setId) {
    return "Needs two logged working sets for direction.";
  }

  const delta = Number(latest.estimatedOneRepMaxKg) - Number(first.estimatedOneRepMaxKg);

  if (!Number.isFinite(delta) || Math.abs(delta) < 0.05) {
    return "Holding steady across this window.";
  }

  return `${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg since first set in range.`;
}
