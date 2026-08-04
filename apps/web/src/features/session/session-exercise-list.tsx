"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { SortableItem, SortableList } from "../../shared/ui/sortable-list";
import type { SessionExercise } from "../../shared/api/types";
import { IconChevronRight } from "../shell/icons";

interface SessionExerciseListProps {
  activeId: string | null;
  canEdit: boolean;
  exercises: SessionExercise[];
  isReordering: boolean;
  onAdd: () => void;
  onReorder: (activeId: string, overId: string) => void;
  onSelect: (id: string) => void;
}

export function SessionExerciseList(props: SessionExerciseListProps): ReactNode {
  const rows = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    if (!props.activeId) return;
    rows.current.get(props.activeId)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [props.activeId]);

  return (
    <section aria-labelledby="workout-exercises-heading" className="glass rounded-xl p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="font-display text-sm font-bold text-fg" id="workout-exercises-heading">
          Exercises
        </h2>
        <span className="text-xs text-outline">{props.exercises.length}</span>
      </div>
      {props.exercises.length > 0 ? (
        <p className="mb-2 text-xs text-fg-muted">Tap an exercise to log sets.</p>
      ) : null}

      {props.exercises.length > 0 ? (
        <div className="max-h-56 space-y-1 overflow-y-auto overscroll-contain pr-1" role="list" aria-label="Workout exercises">
          <SortableList
            disabled={!props.canEdit || props.isReordering}
            ids={props.exercises.map((exercise) => exercise.id)}
            onReorder={props.onReorder}
          >
            {props.exercises.map((exercise) => {
              const active = exercise.id === props.activeId;

              return (
                <SortableItem
                  disabled={!props.canEdit || props.isReordering}
                  id={exercise.id}
                  key={exercise.id}
                  label={exercise.exercise.name}
                >
                  {({ dragHandle, isDragging }) => (
                    <div
                      className={`flex min-h-13 items-center rounded-lg border transition-colors ${
                        active
                          ? "border-cyan bg-cyan/12 text-cyan shadow-glow-cyan"
                          : "border-outline-dim/60 bg-surface-low/30 text-fg-muted"
                      } ${isDragging ? "bg-surface" : ""}`}
                    >
                      {props.canEdit ? dragHandle : <span className="w-3" />}
                      <button
                        aria-pressed={active}
                        className="flex min-h-13 min-w-0 flex-1 items-center gap-3 px-2 text-left"
                        onClick={() => props.onSelect(exercise.id)}
                        ref={(element) => {
                          if (element) rows.current.set(exercise.id, element);
                          else rows.current.delete(exercise.id);
                        }}
                        type="button"
                      >
                        <span className="w-5 shrink-0 font-mono text-[10px] text-outline">
                          {String(exercise.position).padStart(2, "0")}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-display text-sm font-bold">
                          {exercise.exercise.name}
                        </span>
                        <span className="shrink-0 font-mono text-xs text-outline">
                          {exercise.sets.length} sets
                        </span>
                        <IconChevronRight className="shrink-0 text-outline" />
                      </button>
                    </div>
                  )}
                </SortableItem>
              );
            })}
          </SortableList>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-outline-dim p-4 text-center text-sm text-fg-muted">
          Add your first exercise to begin logging sets.
        </p>
      )}

      {props.canEdit ? (
        <button
          className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-cyan/50 font-display text-xs font-bold text-cyan transition-colors hover:border-cyan hover:bg-cyan/10"
          onClick={props.onAdd}
          type="button"
        >
          Choose exercises
        </button>
      ) : null}
    </section>
  );
}
