"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ConfirmDialog } from "../../shared/ui/confirm-dialog";
import { Button } from "../../shared/ui/button";
import { Sheet } from "../../shared/ui/sheet";
import { ErrorState, Skeleton } from "../../shared/ui/ui";
import { formatDay } from "../../shared/format";
import { apiFetch, errorMessage } from "../../shared/api/client";
import { useTemplateMutations, useTemplates } from "../../shared/api/hooks";
import type { WorkoutTemplate } from "../../shared/api/types";
import { IconMore } from "../../shared/ui/icons";
import { FacetFilters, type FacetFilterValue } from "../workouts/facet-filters";
import { usePersistentFilters } from "../workouts/filter-persistence";
import { TemplateEditor } from "./template-editor";

const sortOptions = [
  { value: "lastUsed", label: "Last used" },
  { value: "name", label: "Name A–Z" },
  { value: "lastEdited", label: "Last edited" }
];
const sortValues = ["lastUsed", "name", "lastEdited"] as const;

export function TemplatesScreen({ userId, initialTemplateId }: { userId: string; initialTemplateId?: string | undefined }): ReactNode {
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
  const [menuId, setMenuId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const templates = useTemplates({ search, ...filters, sort });
  const [openedLink, setOpenedLink] = useState(false);
  const linkedTemplate = useQuery({
    queryKey: ["linked-template", userId, initialTemplateId],
    enabled: Boolean(initialTemplateId) && !openedLink,
    queryFn: async ({ signal }) => (await apiFetch<{ template: WorkoutTemplate }>(`/api/workout-templates/${initialTemplateId}`, { signal })).template
  });
  useEffect(() => {
    if (!openedLink && linkedTemplate.data) { setEditing(linkedTemplate.data); setOpenedLink(true); }
  }, [linkedTemplate.data, openedLink]);

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
      setActionError(errorMessage(caught, "Couldn't start the workout. Check your connection and try again."));
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

  const list = templates.data ?? [];
  const menuTemplate = list.find((template) => template.id === menuId) ?? null;

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 pb-6 pt-4 lg:px-6">
      <h1 className="text-title-1 text-text">Templates</h1>
      <input
        aria-label="Search workout templates"
        className="min-h-[3.125rem] w-full rounded-[var(--radius-control)] border border-control-line bg-surface-raised px-3 text-body text-text placeholder:text-text-muted"
        onChange={(event) => setSearchInput(event.currentTarget.value)}
        placeholder="Search templates or exercises"
        type="search"
        value={searchInput}
      />
      <FacetFilters filters={filters} onChange={setFilters} onClear={clear} onSortChange={(value) => setSort(value as typeof sort)} sort={sort} sortOptions={sortOptions} />

      {actionError ? <ErrorState message={actionError} title="That didn't work" /> : null}
      {linkedTemplate.isError && !openedLink ? <ErrorState message={errorMessage(linkedTemplate.error, "Couldn't open the linked template. Try again.")} retry={() => void linkedTemplate.refetch()} /> : null}
      {templates.isLoading ? <TemplateSkeleton /> : templates.isError ? (
        <ErrorState message={errorMessage(templates.error, "Couldn't load your templates. Check your connection and try again.")} retry={() => void templates.refetch()} />
      ) : list.length === 0 ? (
        <p className="rounded-[var(--radius-card)] bg-surface p-4 text-subhead text-text-secondary">
          {search || hasFilters(filters) ? "No templates match this search or these filters." : "No templates yet. Create one to start a repeatable workout in one tap."}
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface">
          {list.map((template) => (
            <li className="flex min-h-[3.75rem] items-center gap-2 py-2 pl-4 pr-2" data-testid="template-card" key={template.id}>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-headline text-text">{template.name}</h2>
                <p className="mt-0.5 text-subhead text-text-secondary">
                  <span className="num">{template.exercises.length}</span> {template.exercises.length === 1 ? "exercise" : "exercises"}, <span className="whitespace-nowrap">{template.lastUsedAt ? `last used ${formatDay(template.lastUsedAt)}` : "not used yet"}</span>
                </p>
                {template.exercises.length > 0 ? (
                  <p className="truncate text-footnote text-text-muted">{template.exercises.slice(0, 4).map((entry) => entry.exercise.name).join(", ")}</p>
                ) : null}
              </div>
              <Button aria-label={`Start workout from ${template.name}`} className="shrink-0" disabled={mutations.start.isPending} onClick={() => void start(template.id)} size="compact" variant="secondary">Start</Button>
              <button aria-label={`More actions for ${template.name}`} className="flex size-11 shrink-0 items-center justify-center rounded-full text-text-secondary active:bg-surface-raised" onClick={() => setMenuId(template.id)} type="button"><IconMore /></button>
            </li>
          ))}
        </ul>
      )}
      <Button className="w-full" onClick={() => setEditing("new")}>New template</Button>

      <TemplateActionsSheet
        isDuplicating={mutations.duplicate.isPending}
        onClose={() => setMenuId(null)}
        onDelete={() => { if (menuTemplate) setDeletingId(menuTemplate.id); setMenuId(null); }}
        onDuplicate={() => {
          if (!menuTemplate) return;
          void mutations.duplicate.mutateAsync({ templateId: menuTemplate.id })
            .then(() => setMenuId(null))
            .catch((caught) => { setMenuId(null); setActionError(errorMessage(caught, "Couldn't duplicate the template. Try again.")); });
        }}
        onEdit={() => { if (menuTemplate) setEditing(menuTemplate); setMenuId(null); }}
        template={menuTemplate}
      />
      <ConfirmDialog
        confirmLabel="Delete template"
        isOpen={deletingId !== null}
        isPending={mutations.remove.isPending}
        message="This removes only the template. Workouts you started from it stay as they are."
        onCancel={() => setDeletingId(null)}
        onConfirm={() => { if (deletingId) void mutations.remove.mutateAsync({ templateId: deletingId }).then(() => setDeletingId(null)).catch((caught) => { setDeletingId(null); setActionError(errorMessage(caught, "Couldn't delete the template. Try again.")); }); }}
        title="Delete this template?"
      />
    </div>
  );
}

function TemplateActionsSheet({ isDuplicating, onClose, onDelete, onDuplicate, onEdit, template }: { isDuplicating: boolean; onClose: () => void; onDelete: () => void; onDuplicate: () => void; onEdit: () => void; template: WorkoutTemplate | null }): ReactNode {
  return (
    <Sheet isOpen={template !== null} labelledBy="template-actions-title" layer="z-[60]" onClose={onClose}>
      <h2 className="mb-3 truncate text-title-3 text-text" id="template-actions-title">{template?.name}</h2>
      <div className="grid gap-2">
        <Button data-modal-initial-focus onClick={onEdit} variant="secondary">Edit</Button>
        <Button disabled={isDuplicating} onClick={onDuplicate} variant="secondary">{isDuplicating ? "Duplicating…" : "Duplicate"}</Button>
        <Button onClick={onDelete} variant="destructive">Delete</Button>
        <Button onClick={onClose} variant="plain">Close</Button>
      </div>
    </Sheet>
  );
}

function TemplateSkeleton(): ReactNode { return <div className="space-y-2"><Skeleton className="h-[3.75rem]" /><Skeleton className="h-[3.75rem]" /><Skeleton className="h-[3.75rem]" /></div>; }
function hasFilters(filters: FacetFilterValue): boolean { return filters.muscleGroupIds.length > 0 || Boolean(filters.equipment || filters.exerciseType); }
