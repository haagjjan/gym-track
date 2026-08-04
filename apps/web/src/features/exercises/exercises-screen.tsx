"use client";

import { useEffect, useState, type ReactNode } from "react";
import { EmptyState, ErrorState, HudButton, Panel, Skeleton } from "../../shared/ui/ui";
import { errorMessage } from "../../shared/api/client";
import { useExerciseMutations, useExercises } from "../../shared/api/hooks";
import type { Exercise } from "../../shared/api/types";
import { IconClose, IconPlus } from "../shell/icons";
import { FacetFilters } from "../workouts/facet-filters";
import { usePersistentFilters } from "../workouts/filter-persistence";
import { WorkoutTabs } from "../workouts/workout-tabs";
import { ExerciseForm } from "./exercise-form";
import { ExerciseMuscleBadges } from "./exercise-muscle-badges";

const sortOptions = [
  { value: "name", label: "Name A–Z" },
  { value: "muscle", label: "Muscle" },
  { value: "equipment", label: "Equipment" },
  { value: "type", label: "Type" }
];
const sortValues = ["name", "muscle", "equipment", "type"] as const;

export function ExercisesScreen({ userId }: { userId: string }): ReactNode {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const { clear, filters, setFilters, setSort, sort } = usePersistentFilters({
    allowedSorts: sortValues,
    defaultSort: "name",
    surface: "exercises",
    userId
  });
  const [editing, setEditing] = useState<Exercise | "new" | null>(null);
  const exercises = useExercises({ search, ...filters, sort });
  const mutations = useExerciseMutations();

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 lg:p-6">
      <header className="flex items-end justify-between gap-3">
        <div><p className="label-caps text-outline">WORKOUTS</p><h1 className="font-display text-2xl font-bold text-fg">Exercise list</h1></div>
        <HudButton onClick={() => setEditing("new")}><IconPlus /> New exercise</HudButton>
      </header>
      <WorkoutTabs active="exercises" />
      <input aria-label="Search exercises" className="min-h-11 w-full rounded border border-outline-dim bg-surface-low/60 px-3 text-sm text-fg placeholder:text-outline focus:border-cyan focus:outline-none" onChange={(event) => setSearchInput(event.currentTarget.value)} placeholder="Search exercise, muscle, or equipment…" type="search" value={searchInput} />
      <FacetFilters filters={filters} onChange={setFilters} onClear={clear} onSortChange={(value) => setSort(value as typeof sort)} showEditability sort={sort} sortOptions={sortOptions} />

      {exercises.isLoading ? <ExerciseSkeleton /> : exercises.isError ? (
        <ErrorState message={errorMessage(exercises.error, "Exercises could not be loaded.")} retry={() => void exercises.refetch()} />
      ) : (exercises.data ?? []).length === 0 ? (
        <EmptyState message="No exercise matches the current search and filters." title="NO_MATCH" />
      ) : (
        <ExerciseList exercises={exercises.data ?? []} onEdit={setEditing} sort={sort} userId={userId} />
      )}
      <ExerciseEditor
        exercise={editing}
        isSaving={mutations.create.isPending || mutations.update.isPending}
        onClose={() => setEditing(null)}
        onSave={async (input) => {
          if (editing === "new") await mutations.create.mutateAsync(input);
          else if (editing) await mutations.update.mutateAsync({ exerciseId: editing.id, input });
          setEditing(null);
        }}
        onSelectExisting={() => setEditing(null)}
      />
    </div>
  );
}

function ExerciseList({ exercises, onEdit, sort, userId }: { exercises: Exercise[]; onEdit: (exercise: Exercise) => void; sort: string; userId: string }): ReactNode {
  let previousGroup = "";
  return (
    <ul className="space-y-2">
      {exercises.map((exercise) => {
        const group = sortGroup(exercise, sort);
        const showGroup = sort !== "name" && group !== previousGroup;
        previousGroup = group;
        const editable = exercise.createdByUserId === userId;
        return (
          <li key={exercise.id}>
            {showGroup ? <p className="label-caps mb-1 mt-4 text-lavender">{group}</p> : null}
            <Panel accent={editable ? "cyan" : "none"} className="flex min-h-20 items-center justify-between gap-3">
              <div className="min-w-0"><h2 className="truncate font-display text-sm font-bold text-fg">{exercise.name}</h2><p className="mt-0.5 text-xs text-outline">{[exercise.equipment, exercise.exerciseType].filter(Boolean).join(" · ") || "Unspecified classification"}</p><ExerciseMuscleBadges exercise={exercise} /></div>
              {editable ? <HudButton className="shrink-0" onClick={() => onEdit(exercise)} variant="outline">Edit</HudButton> : <ReadOnlyInfo exerciseId={exercise.id} system={exercise.createdByUserId === null} />}
            </Panel>
          </li>
        );
      })}
    </ul>
  );
}

function ReadOnlyInfo({ exerciseId, system }: { exerciseId: string; system: boolean }): ReactNode {
  const [open, setOpen] = useState(false);
  const message = system
    ? "This is a system exercise. It stays consistent for everyone and cannot be edited."
    : "Another user created this shared exercise. Only its creator can edit it.";
  return (
    <div className="group relative shrink-0">
      <button aria-describedby={`read-only-help-${exerciseId}`} aria-expanded={open} className="flex min-h-11 items-center rounded border border-outline-dim px-3 text-xs text-outline hover:border-cyan hover:text-cyan" onBlur={() => setOpen(false)} onClick={() => setOpen((current) => !current)} onFocus={() => setOpen(true)} type="button">Read only · ⓘ</button>
      <p className={`absolute right-0 top-12 z-20 w-64 rounded-lg border border-outline-dim bg-surface p-3 text-xs leading-5 text-fg-muted shadow-2xl ${open ? "block" : "hidden group-hover:block"}`} id={`read-only-help-${exerciseId}`} role="tooltip">{message}</p>
    </div>
  );
}

function ExerciseEditor({ exercise, isSaving, onClose, onSave, onSelectExisting }: { exercise: Exercise | "new" | null; isSaving: boolean; onClose: () => void; onSave: Parameters<typeof ExerciseForm>[0]["onSubmit"]; onSelectExisting: (exercise: Exercise) => void }): ReactNode {
  if (!exercise) return null;
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-void/70 backdrop-blur-sm lg:items-center"><section aria-labelledby="exercise-editor-title" aria-modal="true" className="glass-cyan max-h-[92dvh] w-full overflow-y-auto rounded-t-xl p-4 lg:max-w-2xl lg:rounded-xl" role="dialog"><header className="mb-3 flex items-center justify-between gap-2"><h2 className="font-display text-lg font-bold text-fg" id="exercise-editor-title">{exercise === "new" ? "Create exercise" : "Edit exercise"}</h2><button aria-label="Close exercise editor" className="flex size-11 items-center justify-center rounded border border-outline-dim text-fg-muted" onClick={onClose} type="button"><IconClose /></button></header><ExerciseForm initial={exercise === "new" ? null : exercise} isSubmitting={isSaving} onCancel={onClose} onSelectExisting={onSelectExisting} onSubmit={onSave} /></section></div>;
}

function sortGroup(exercise: Exercise, sort: string): string { if (sort === "muscle") return exercise.primaryMuscleGroups[0]?.name ?? "Unspecified"; if (sort === "equipment") return exercise.equipment ?? "Unspecified"; if (sort === "type") return exercise.exerciseType ?? "Unspecified"; return ""; }
function ExerciseSkeleton(): ReactNode { return <div className="space-y-2"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div>; }
