import type { ReactNode } from "react";
import type { Exercise } from "../../shared/api/types";

export function ExerciseMuscleBadges({ exercise }: { exercise: Pick<Exercise, "muscleGroups" | "trackingMode"> }): ReactNode {
  const primary = exercise.muscleGroups.filter((muscle) => muscle.role === "PRIMARY").map((muscle) => muscle.name);
  const secondary = exercise.muscleGroups.filter((muscle) => muscle.role === "SECONDARY").map((muscle) => muscle.name);
  const tracked = exercise.trackingMode === "time" ? "Logged by time" : exercise.trackingMode === "cardio" ? "Cardio" : null;
  if (primary.length === 0 && secondary.length === 0 && !tracked) return null;

  return (
    <span className="mt-0.5 block text-footnote text-text-secondary">
      {tracked ? <span className="block truncate font-semibold text-accent">{tracked}</span> : null}
      {primary.length > 0 ? <span className="block truncate">Primary: {primary.join(", ")}</span> : null}
      {secondary.length > 0 ? <span className="block truncate text-text-muted">Secondary: {secondary.join(", ")}</span> : null}
    </span>
  );
}
