"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "../../shared/ui/button";
import { SortableItem, SortableList } from "../../shared/ui/sortable-list";
import type { SessionExercise } from "../../shared/api/types";
import { IconForward, IconPlus24 } from "../../shared/ui/icons";

interface SessionExerciseListProps {
  activeId: string | null;
  /** Logged time and cardio entries per exercise id. */
  entryCounts?: Map<string, number>;
  canEdit: boolean;
  exercises: SessionExercise[];
  isReordering: boolean;
  onAdd: () => void;
  /** Scroll the active row into view; false until the user picks an exercise. */
  followActive: boolean;
  onReorder: (activeId: string, overId: string) => void;
  onSelect: (id: string) => void;
  /** The cardio section reuses this list with its own title and wording. */
  variant?: "exercises" | "cardio";
}

/** The workout's exercises as a grouped list. Drag the handle to reorder. */
export function SessionExerciseList(props: SessionExerciseListProps): ReactNode {
  const rows = useRef(new Map<string, HTMLButtonElement>());
  const empty = props.exercises.length === 0;
  const variant = props.variant ?? "exercises";
  const cardio = variant === "cardio";

  // Only after the user picked or added an exercise. Scrolling to the default
  // selection on first load would open the screen part-way down.
  useEffect(() => {
    if (!props.followActive || !props.activeId) return;
    rows.current.get(props.activeId)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [props.activeId, props.followActive]);

  return (
    <section aria-labelledby={`workout-${variant}-heading`}>
      <h2 className="mb-2 px-1 text-title-3 text-text" id={`workout-${variant}-heading`}>
        {cardio ? "Cardio" : "Exercises"}
      </h2>

      {empty ? (
        <p className="rounded-[var(--radius-card)] bg-surface p-4 text-body text-text-secondary">
          {cardio
            ? (props.canEdit ? "No cardio yet. Add a run, ride or row." : "No cardio was logged in this workout.")
            : (props.canEdit ? "No exercises yet. Add one to start logging sets." : "No exercises were logged in this workout.")}
        </p>
      ) : (
        <div aria-label={cardio ? "Workout cardio" : "Workout exercises"} className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface" role="list">
          <SortableList
            disabled={!props.canEdit || props.isReordering}
            ids={props.exercises.map((exercise) => exercise.id)}
            onReorder={props.onReorder}
          >
            {props.exercises.map((exercise) => (
              <SortableItem
                disabled={!props.canEdit || props.isReordering}
                id={exercise.id}
                key={exercise.id}
                label={exercise.exercise.name}
              >
                {({ dragHandle, isDragging }) => (
                  <div className={`flex min-h-[3.75rem] items-center ${isDragging ? "bg-surface-raised" : "bg-surface"}`}>
                    {props.canEdit ? dragHandle : <span className="w-4 flex-none" />}
                    <button
                      className="flex min-h-[3.75rem] min-w-0 flex-1 items-center gap-3 pr-4 text-left active:bg-surface-raised"
                      onClick={() => props.onSelect(exercise.id)}
                      ref={(element) => {
                        if (element) rows.current.set(exercise.id, element);
                        else rows.current.delete(exercise.id);
                      }}
                      type="button"
                    >
                      <span className="min-w-0 flex-1 py-2">
                        <span className="block break-words text-headline text-text">{exercise.exercise.name}</span>
                        <span className="block text-subhead text-text-secondary">
                          {setCountLabel(exercise, props.entryCounts, props.canEdit)}
                        </span>
                      </span>
                      <IconForward aria-hidden className="flex-none text-text-muted" />
                    </button>
                  </div>
                )}
              </SortableItem>
            ))}
          </SortableList>
        </div>
      )}

      {props.canEdit ? (
        <Button className="mt-3 w-full" onClick={props.onAdd} variant={empty ? "primary" : "secondary"}>
          <IconPlus24 /> {cardio ? "Add cardio" : "Add exercises"}
        </Button>
      ) : null}
    </section>
  );
}

/** "3 sets" for weight and time exercises, "1 entry" for cardio. Time and cardio counts come from `entryCounts`. */
function setCountLabel(exercise: SessionExercise, entryCounts: Map<string, number> | undefined, canEdit: boolean): string {
  const mode = exercise.exercise.trackingMode;
  const count = mode ? entryCounts?.get(exercise.exercise.id) ?? 0 : exercise.sets.length;
  const [one, many] = mode === "cardio" ? ["entry", "entries"] : ["set", "sets"];
  if (count === 0) return canEdit ? `No ${many} yet` : `No ${many}`;
  return `${count} ${count === 1 ? one : many}`;
}
