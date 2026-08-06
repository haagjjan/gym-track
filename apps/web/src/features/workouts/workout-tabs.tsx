import Link from "next/link";
import type { ReactNode } from "react";

type WorkoutSection = "history" | "templates" | "exercises";

const sections: Array<{ id: WorkoutSection; href: string; label: string }> = [
  { id: "history", href: "/workouts", label: "Workout History" },
  { id: "templates", href: "/workouts/templates", label: "Workout Templates" },
  { id: "exercises", href: "/workouts/exercises", label: "Exercise List" }
];

export function WorkoutTabs({ active }: { active: WorkoutSection }): ReactNode {
  return (
    <nav
      aria-label="Workout sections"
      className="grid grid-cols-3 border-b border-outline-dim/60"
    >
      {sections.map((section) => (
        <Link
          aria-current={active === section.id ? "page" : undefined}
          className={`flex min-h-11 items-center justify-center px-1 py-2 text-center font-display text-[10px] font-bold uppercase tracking-[0.06em] sm:px-4 sm:text-xs sm:tracking-[0.08em] ${
            active === section.id
              ? "border-b-2 border-cyan text-cyan"
              : "text-outline hover:text-fg-muted"
          }`}
          href={section.href}
          key={section.id}
        >
          {section.label}
        </Link>
      ))}
    </nav>
  );
}
