import type { ReactNode } from "react";
import type { Exercise } from "../../shared/api/types";

export function ExerciseMuscleBadges({ exercise }: { exercise: Pick<Exercise, "muscleGroups"> }): ReactNode {
  const primary = exercise.muscleGroups.filter((muscle) => muscle.role === "PRIMARY").map((muscle) => muscle.name);
  const secondary = exercise.muscleGroups.filter((muscle) => muscle.role === "SECONDARY").map((muscle) => muscle.name);
  if (primary.length === 0 && secondary.length === 0) return null;

  return (
    <span className="mt-0.5 block text-footnote text-text-secondary">
      {primary.length > 0 ? <span className="block truncate">Primary: {primary.join(", ")}</span> : null}
      {secondary.length > 0 ? <span className="block truncate text-text-muted">Secondary: {secondary.join(", ")}</span> : null}
    </span>
  );
}
