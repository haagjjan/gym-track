"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ConfirmDialog } from "../../shared/ui/confirm-dialog";
import { EmptyState, ErrorState, HudButton, Panel, Skeleton } from "../../shared/ui/ui";
import { errorMessage } from "../../shared/api/client";
import { useTemplateMutations, useTemplates } from "../../shared/api/hooks";
import type { WorkoutTemplate } from "../../shared/api/types";
import { IconPlus } from "../shell/icons";
import { FacetFilters, type FacetFilterValue } from "../workouts/facet-filters";
import { usePersistentFilters } from "../workouts/filter-persistence";
import { WorkoutTabs } from "../workouts/workout-tabs";
import { TemplateEditor } from "./template-editor";

const sortOptions = [
  { value: "lastUsed", label: "Last used" },
  { value: "name", label: "Name A–Z" },
  { value: "lastEdited", label: "Last edited" }
];
const sortValues = ["lastUsed", "name", "lastEdited"] as const;

export function TemplatesScreen({ userId }: { userId: string }): ReactNode {
  const router = useRouter();
  const mutations = useTemplateMutations();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const { clear, filters, setFilters, setSort, sort } = usePersistentFilters({
    allowedSorts: sortValues,
    defaultSort: "lastUsed",
    surface: "templates",
    userId
  });
  const [editing, setEditing] = useState<WorkoutTemplate | "new" | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const templates = useTemplates({ search, ...filters, sort });

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  async function start(templateId: string): Promise<void> {
    setActionError(null);
    try {
      const result = await mutations.start.mutateAsync({ templateId });
      router.push(`/workouts/${result.workoutId}?focusName=1`);
    } catch (caught) {
      setActionError(errorMessage(caught, "The workout could not be started."));
    }
  }

  if (editing) {
    return (
      <TemplateEditor
        initial={editing === "new" ? null : editing}
        isSaving={mutations.create.isPending || mutations.update.isPending}
        onCancel={() => setEditing(null)}
        onSave={async (name, exerciseIds) => {
          if (editing === "new") await mutations.create.mutateAsync({ name, exerciseIds });
          else await mutations.update.mutateAsync({ templateId: editing.id, name, exerciseIds });
          setEditing(null);
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 lg:p-6">
      <header className="flex items-end justify-between gap-3">
        <div><p className="label-caps text-outline">WORKOUTS</p><h1 className="font-display text-2xl font-bold text-fg">Workout templates</h1></div>
        <HudButton onClick={() => setEditing("new")}><IconPlus /> New template</HudButton>
      </header>
      <WorkoutTabs active="templates" />
      <input
        aria-label="Search workout templates"
        className="min-h-11 w-full rounded border border-outline-dim bg-surface-low/60 px-3 text-sm text-fg placeholder:text-outline focus:border-cyan focus:outline-none"
        onChange={(event) => setSearchInput(event.currentTarget.value)}
        placeholder="Search template or exercise…"
        type="search"
        value={searchInput}
      />
      <FacetFilters filters={filters} onChange={setFilters} onClear={clear} onSortChange={(value) => setSort(value as typeof sort)} sort={sort} sortOptions={sortOptions} />

      {actionError ? <ErrorState message={actionError} title="TEMPLATE_ACTION_FAILED" /> : null}
      {templates.isLoading ? <TemplateSkeleton /> : templates.isError ? (
        <ErrorState message={errorMessage(templates.error, "Templates could not be loaded.")} retry={() => void templates.refetch()} />
      ) : (templates.data ?? []).length === 0 ? (
        <EmptyState message={search || hasFilters(filters) ? "No template matches these filters." : "Create a reusable ordered exercise list."} title={search || hasFilters(filters) ? "NO_MATCHES" : "NO_TEMPLATES"} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {(templates.data ?? []).map((template) => (
            <li className="h-full" data-testid="template-card" key={template.id}>
              <TemplateCard
                isDuplicating={mutations.duplicate.isPending}
                isStarting={mutations.start.isPending}
                onDelete={() => setDeletingId(template.id)}
                onDuplicate={() => void mutations.duplicate.mutateAsync({ templateId: template.id }).catch((caught) => setActionError(errorMessage(caught, "Duplicate failed.")))}
                onEdit={() => setEditing(template)}
                onStart={() => void start(template.id)}
                template={template}
              />
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        confirmLabel="DELETE TEMPLATE"
        isOpen={deletingId !== null}
        isPending={mutations.remove.isPending}
        message="This removes only the reusable template. Existing workouts stay intact."
        onCancel={() => setDeletingId(null)}
        onConfirm={() => { if (deletingId) void mutations.remove.mutateAsync({ templateId: deletingId }).then(() => setDeletingId(null)).catch((caught) => setActionError(errorMessage(caught, "Delete failed."))); }}
        title="Delete this workout template?"
      />
    </div>
  );
}

function TemplateCard({ isDuplicating, isStarting, onDelete, onDuplicate, onEdit, onStart, template }: { isDuplicating: boolean; isStarting: boolean; onDelete: () => void; onDuplicate: () => void; onEdit: () => void; onStart: () => void; template: WorkoutTemplate }): ReactNode {
  return (
    <Panel accent="lavender" className="flex h-full flex-col">
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-lg font-bold text-fg">{template.name}</h2>
        <p className="mt-1 text-xs text-outline">{template.exercises.length} exercises · {template.lastUsedAt ? `last used ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(template.lastUsedAt))}` : "not used yet"}</p>
        <ol className="mt-2 flex flex-wrap gap-1 text-[10px] text-fg-muted">
          {template.exercises.slice(0, 5).map((entry) => <li className="rounded-sm border border-outline-dim/60 px-1.5 py-0.5" key={entry.id}>{entry.position}. {entry.exercise.name}</li>)}
          {template.exercises.length > 5 ? <li className="px-1.5 py-0.5 text-outline">+{template.exercises.length - 5}</li> : null}
        </ol>
      </div>
      <div className="mt-4 border-t border-outline-dim/50 pt-3">
        <HudButton className="w-full" disabled={isStarting} onClick={onStart}>Start workout</HudButton>
        <div className="mt-2 grid grid-cols-3 gap-1"><HudButton onClick={onEdit} size="sm" variant="outline">Edit</HudButton><HudButton disabled={isDuplicating} onClick={onDuplicate} size="sm" variant="ghost">Duplicate</HudButton><HudButton onClick={onDelete} size="sm" variant="danger">Delete</HudButton></div>
      </div>
    </Panel>
  );
}

function TemplateSkeleton(): ReactNode { return <div className="grid gap-3 sm:grid-cols-2"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>; }
function hasFilters(filters: FacetFilterValue): boolean { return filters.muscleGroupIds.length > 0 || Boolean(filters.equipment || filters.exerciseType); }
