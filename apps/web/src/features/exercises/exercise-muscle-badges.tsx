import type { ReactNode } from "react";
import type { Exercise, ExerciseMuscleGroup } from "../../shared/api/types";

export function ExerciseMuscleBadges({ exercise }: { exercise: Pick<Exercise, "muscleGroups"> }): ReactNode {
  const primary = exercise.muscleGroups.filter((muscle) => muscle.role === "PRIMARY");
  const secondary = exercise.muscleGroups.filter((muscle) => muscle.role === "SECONDARY");

  return (
    <span className="mt-1 flex flex-wrap gap-1">
      <MuscleBadge label="Primary" muscles={primary} tone="cyan" />
      {secondary.length > 0 ? (
        <MuscleBadge label="Secondary" muscles={secondary} tone="lavender" />
      ) : null}
    </span>
  );
}

function MuscleBadge({ label, muscles, tone }: { label: string; muscles: ExerciseMuscleGroup[]; tone: "cyan" | "lavender" }): ReactNode {
  return <span className={`rounded-sm border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.06em] ${tone === "cyan" ? "border-cyan/40 text-cyan-dim" : "border-lavender/40 text-lavender"}`}>{label}: {muscles.map((muscle) => muscle.name).join(", ")}</span>;
}
