import type { ReactNode } from "react";
import { StartSessionAction } from "../workouts/workout-entry-point";
import type { WorkoutSummary } from "../workouts/workout-types";

interface HomeSessionCtaProps {
  activeWorkout: WorkoutSummary | null;
}

export function HomeSessionCta({ activeWorkout }: HomeSessionCtaProps): ReactNode {
  const label = activeWorkout ? "RESUME_SESSION" : "START_SESSION";
  const message = activeWorkout
    ? "Open mission selection and continue the active workout already in progress."
    : "Open mission selection and launch the next session.";

  return (
    <section className="homeSessionCta" aria-labelledby="home-session-cta-title">
      <div className="homeSessionCta__copy">
        <p className="homeSessionCta__eyebrow">NEXT_ACTION</p>
        <h2 id="home-session-cta-title">{label}</h2>
        <p>{message}</p>
      </div>
      <StartSessionAction label={label} pendingLabel="SYNCING" variant="cockpit" />
    </section>
  );
}
