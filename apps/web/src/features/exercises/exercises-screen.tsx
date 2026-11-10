"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "../../shared/ui/button";
import { ErrorState, Skeleton } from "../../shared/ui/ui";
import { errorMessage } from "../../shared/api/client";
import { useExerciseMutations, useExercises } from "../../shared/api/hooks";
import type { Exercise } from "../../shared/api/types";
import { FacetFilters } from "../workouts/facet-filters";
import { usePersistentFilters } from "../workouts/filter-persistence";
import { ExerciseEditorDialog } from "./exercise-editor-dialog";
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
    <div className="mx-auto max-w-3xl space-y-4 px-4 pb-6 pt-4 lg:px-6">
      <h1 className="text-title-1 text-text">Exercise library</h1>
      <input aria-label="Search exercises" className="min-h-[3.125rem] w-full rounded-[var(--radius-control)] border border-control-line bg-surface-raised px-3 text-body text-text placeholder:text-text-muted" onChange={(event) => setSearchInput(event.currentTarget.value)} placeholder="Search by exercise, muscle or equipment" type="search" value={searchInput} />
      <FacetFilters filters={filters} onChange={setFilters} onClear={clear} onSortChange={(value) => setSort(value as typeof sort)} showEditability sort={sort} sortOptions={sortOptions} />

      {exercises.isLoading ? <ExerciseSkeleton /> : exercises.isError ? (
        <ErrorState message={errorMessage(exercises.error, "Couldn't load exercises. Check your connection and try again.")} retry={() => void exercises.refetch()} />
      ) : (exercises.data ?? []).length === 0 ? (
        <p className="rounded-[var(--radius-card)] bg-surface p-4 text-subhead text-text-secondary">No exercises match this search and these filters.</p>
      ) : (
        <ExerciseList exercises={exercises.data ?? []} onEdit={setEditing} sort={sort} userId={userId} />
      )}
      <Button className="w-full" onClick={() => setEditing("new")}>New exercise</Button>
      <ExerciseEditorDialog
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
  const sections: Array<{ group: string; items: Exercise[] }> = [];
  for (const exercise of exercises) {
    const group = sortGroup(exercise, sort);
    const last = sections[sections.length - 1];
    if (last && last.group === group) last.items.push(exercise);
    else sections.push({ group, items: [exercise] });
  }
  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <section key={section.group || "all"}>
          {section.group ? <h2 className="px-1 pb-1 text-subhead text-text-secondary">{section.group}</h2> : null}
          <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface">
            {section.items.map((exercise) => {
              const editable = exercise.createdByUserId === userId;
              return (
                <li className="flex min-h-[3.75rem] items-center justify-between gap-2 py-2 pl-4 pr-2" key={exercise.id}>
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 break-words text-headline text-text" title={exercise.name}>{exercise.name}</h3>
                    <p className="mt-0.5 line-clamp-2 break-words text-subhead text-text-secondary">{[exercise.equipment, exercise.exerciseType].filter(Boolean).map((value) => displayLabel(value as string)).join(", ") || "Not classified"}</p>
                    <ExerciseMuscleBadges exercise={exercise} />
                  </div>
                  {editable ? <Button aria-label={`Edit ${exercise.name}`} className="shrink-0" onClick={() => onEdit(exercise)} size="compact" variant="plain">Edit</Button> : <ReadOnlyInfo exerciseId={exercise.id} system={exercise.createdByUserId === null} />}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

// Plain text instead of a tooltip: there is no hover on phones.
function ReadOnlyInfo({ exerciseId, system }: { exerciseId: string; system: boolean }): ReactNode {
  return <span className="shrink-0 px-3 text-footnote text-text-muted" id={`read-only-help-${exerciseId}`}>{system ? "Built in" : "Shared"}</span>;
}

function sortGroup(exercise: Exercise, sort: string): string { if (sort === "muscle") return exercise.primaryMuscleGroups[0]?.name ?? "Other"; if (sort === "equipment") return exercise.equipment ?? "Unspecified"; if (sort === "type") return exercise.exerciseType ?? "Unspecified"; return ""; }
function displayLabel(value: string): string { return value.charAt(0).toUpperCase() + value.slice(1); }
function ExerciseSkeleton(): ReactNode { return <div className="space-y-2"><Skeleton className="h-[3.75rem]" /><Skeleton className="h-[3.75rem]" /><Skeleton className="h-[3.75rem]" /></div>; }
