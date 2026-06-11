import Link from "next/link";
import type { ReactNode } from "react";
import type { WorkoutSummary } from "../workouts/workout-types";
import { CockpitEmptyState, CockpitLoadingState } from "../../shared/ui/cockpit";
import { shortDate } from "./dashboard-data";

interface PreviousSessionsStripProps {
  isLoading: boolean;
  workouts: WorkoutSummary[];
}

export function PreviousSessionsStrip({
  isLoading,
  workouts
}: PreviousSessionsStripProps): ReactNode {
  return (
    <section className="previousSessionsStrip" aria-labelledby="previous-sessions-title">
      <div className="previousSessionsStrip__header">
        <p className="previousSessionsStrip__eyebrow">PREVIOUS_SESSIONS</p>
        <h2 id="previous-sessions-title">Recent session history</h2>
      </div>

      {isLoading ? (
        <CockpitLoadingState title="LOADING_SESSIONS" message="Reading recent workout history." />
      ) : workouts.length > 0 ? (
        <div className="previousSessionsStrip__list">
          {workouts.map((workout) => (
            <Link
              key={workout.id}
              className="previousSessionsStrip__item"
              href={`/workouts/${workout.id}`}
            >
              <span>{workout.title ?? `SESSION_${shortDate(workout.startedAt)}`}</span>
              <strong>{shortDate(workout.startedAt)}</strong>
              <small>
                {workout.totalExercises} exercises / {workout.totalSets} sets
              </small>
            </Link>
          ))}
        </div>
      ) : (
        <CockpitEmptyState
          title="NO_PREVIOUS_SESSIONS"
          message="Completed workouts will line up here once history is available."
        />
      )}
    </section>
  );
}
