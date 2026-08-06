"use client";

import { useState, type ReactNode } from "react";
import { HudButton } from "../../shared/ui/ui";
import { useExerciseOptions, useMuscleGroups } from "../../shared/api/hooks";
import { emptyStoredFacetFilters, type StoredFacetFilters } from "./filter-persistence";

export type FacetFilterValue = StoredFacetFilters;

interface FacetFiltersProps {
  filters: FacetFilterValue;
  onChange: (filters: FacetFilterValue) => void;
  onClear?: (() => void) | undefined;
  onSortChange: (sort: string) => void;
  showEditability?: boolean | undefined;
  sort: string;
  sortOptions: Array<{ label: string; value: string }>;
}

export function FacetFilters(props: FacetFiltersProps): ReactNode {
  const [sheetOpen, setSheetOpen] = useState(false);
  const muscles = useMuscleGroups();
  const options = useExerciseOptions();
  const activeCount = props.filters.muscleGroupIds.length
    + (props.filters.equipment ? 1 : 0)
    + (props.filters.exerciseType ? 1 : 0)
    + (props.filters.ownership ? 1 : 0);
  const fields = (
    <FilterFields
      equipmentOptions={options.data?.equipment ?? []}
      filters={props.filters}
      muscleOptions={muscles.data ?? []}
      onChange={props.onChange}
      onClear={props.onClear}
      onSortChange={props.onSortChange}
      showEditability={props.showEditability}
      sort={props.sort}
      sortOptions={props.sortOptions}
    />
  );

  return (
    <>
      <div className="hidden items-end gap-2 md:flex">{fields}</div>
      <div className="flex gap-2 md:hidden">
        <HudButton className="flex-1" onClick={() => setSheetOpen(true)} variant="outline">
          Filters{activeCount > 0 ? ` (${activeCount})` : ""}
        </HudButton>
        <label className="min-w-36 flex-1">
          <span className="sr-only">Sort</span>
          <select className={selectClassName} onChange={(event) => props.onSortChange(event.currentTarget.value)} value={props.sort}>
            {props.sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>

      {sheetOpen ? (
        <div className="fixed inset-0 z-[65] flex items-end bg-void/75 backdrop-blur-sm md:hidden">
          <section aria-labelledby="filter-sheet-title" aria-modal="true" className="max-h-[88dvh] w-full overflow-y-auto rounded-t-2xl border border-outline-dim bg-surface p-4 pb-[max(env(safe-area-inset-bottom),1rem)]" role="dialog">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-fg" id="filter-sheet-title">Filter results</h2>
              <button aria-label="Close filters" className="flex size-11 items-center justify-center rounded border border-outline-dim text-xl text-fg-muted" onClick={() => setSheetOpen(false)} type="button">×</button>
            </div>
            <div className="space-y-4">{fields}</div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <HudButton onClick={() => clearFilters(props)} variant="ghost">Clear</HudButton>
              <HudButton onClick={() => setSheetOpen(false)}>Show results</HudButton>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function FilterFields({
  equipmentOptions,
  filters,
  muscleOptions,
  onChange,
  onClear,
  onSortChange,
  showEditability,
  sort,
  sortOptions
}: FacetFiltersProps & {
  equipmentOptions: string[];
  muscleOptions: Array<{ id: string; name: string }>;
}): ReactNode {
  return (
    <>
      <details className="relative md:w-48">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded border border-outline-dim bg-surface-low/50 px-3 text-xs text-fg-muted">
          Muscles{filters.muscleGroupIds.length > 0 ? ` (${filters.muscleGroupIds.length})` : ""}<span>⌄</span>
        </summary>
        <div className="mt-2 space-y-1 rounded-lg border border-outline-dim bg-surface p-2 md:absolute md:z-20 md:max-h-72 md:w-64 md:overflow-y-auto md:shadow-2xl">
          {muscleOptions.map((muscle) => (
            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded px-2 text-sm text-fg-muted hover:bg-surface-low" key={muscle.id}>
              <input
                checked={filters.muscleGroupIds.includes(muscle.id)}
                className="size-4 accent-cyan"
                onChange={() => onChange({ ...filters, muscleGroupIds: toggle(filters.muscleGroupIds, muscle.id) })}
                type="checkbox"
              />
              {muscle.name}
            </label>
          ))}
        </div>
      </details>

      <SelectFilter label="Equipment" onChange={(equipment) => onChange({ ...filters, equipment })} options={equipmentOptions} value={filters.equipment} />
      <SelectFilter label="Type" onChange={(exerciseType) => onChange({ ...filters, exerciseType })} options={["compound", "isolation", "isometric", "other"]} value={filters.exerciseType} />
      {showEditability ? (
        <label className="block md:w-48">
          <span className="label-caps mb-1 block text-outline">Editability</span>
          <select className={selectClassName} onChange={(event) => onChange({ ...filters, ownership: event.currentTarget.value as FacetFilterValue["ownership"] })} value={filters.ownership}>
            <option value="">All</option>
            <option value="editable">Editable by me</option>
            <option value="readOnly">Read-only</option>
          </select>
        </label>
      ) : null}
      <label className="hidden md:block md:w-44">
        <span className="label-caps mb-1 block text-outline">Sort</span>
        <select className={selectClassName} onChange={(event) => onSortChange(event.currentTarget.value)} value={sort}>
          {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <button className="hidden min-h-11 px-2 text-xs text-outline hover:text-cyan md:block" onClick={() => onClear ? onClear() : onChange(emptyFacetFilters())} type="button">Clear</button>
    </>
  );
}

function SelectFilter({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: string[]; value: string }): ReactNode {
  return (
    <label className="block md:w-48">
      <span className="label-caps mb-1 block text-outline">{label}</span>
      <select className={selectClassName} onChange={(event) => onChange(event.currentTarget.value)} value={value}>
        <option value="">All</option>
        <option value="unspecified">Unspecified</option>
        {options.map((option) => <option key={option} value={option}>{displayLabel(option)}</option>)}
      </select>
    </label>
  );
}

export function emptyFacetFilters(): FacetFilterValue {
  return emptyStoredFacetFilters();
}

function clearFilters(props: FacetFiltersProps): void {
  if (props.onClear) props.onClear();
  else props.onChange(emptyFacetFilters());
}

function toggle(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function displayLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const selectClassName = "min-h-11 w-full rounded border border-outline-dim bg-surface-low/60 px-3 text-sm text-fg focus:border-cyan focus:outline-none";
