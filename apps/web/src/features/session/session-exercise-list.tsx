"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "../../shared/ui/button";
import { SortableItem, SortableList } from "../../shared/ui/sortable-list";
import type { SessionExercise } from "../../shared/api/types";
import { IconForward, IconPlus24 } from "../../shared/ui/icons";

interface SessionExerciseListProps {
  activeId: string | null;
  canEdit: boolean;
  exercises: SessionExercise[];
  isReordering: boolean;
  onAdd: () => void;
  onReorder: (activeId: string, overId: string) => void;
  onSelect: (id: string) => void;
}

/** The workout's exercises as a grouped list. Drag the handle to reorder. */
export function SessionExerciseList(props: SessionExerciseListProps): ReactNode {
  const rows = useRef(new Map<string, HTMLButtonElement>());
  const empty = props.exercises.length === 0;

  useEffect(() => {
    if (!props.activeId) return;
    rows.current.get(props.activeId)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [props.activeId]);

  return (
    <section aria-labelledby="workout-exercises-heading">
      <h2 className="mb-2 px-1 text-title-3 text-text" id="workout-exercises-heading">
        Exercises
      </h2>

      {empty ? (
        <p className="rounded-[var(--radius-card)] bg-surface p-4 text-body text-text-secondary">
          {props.canEdit ? "No exercises yet. Add one to start logging sets." : "No exercises were logged in this workout."}
        </p>
      ) : (
        <div aria-label="Workout exercises" className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface" role="list">
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
                          {exercise.sets.length === 0 ? (props.canEdit ? "No sets yet" : "No sets") : `${exercise.sets.length} ${exercise.sets.length === 1 ? "set" : "sets"}`}
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
          <IconPlus24 /> Add exercises
        </Button>
      ) : null}
    </section>
  );
}
