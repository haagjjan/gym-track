"use client";

import { useState, type ReactNode } from "react";
import { useModalBehavior } from "../../shared/ui/use-modal-behavior";
import { Button } from "../../shared/ui/button";
import { SheetGrabber, sheetPanelClass } from "../../shared/ui/sheet";
import { IconChevronDown, IconClose } from "../../shared/ui/icons";
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
  const sheetRef = useModalBehavior<HTMLElement>({
    isOpen: sheetOpen,
    onClose: () => setSheetOpen(false)
  });
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
        <Button className="flex-1" onClick={() => setSheetOpen(true)} variant="secondary">
          Filters{activeCount > 0 ? ` (${activeCount})` : ""}
        </Button>
        <label className="min-w-36 flex-1">
          <span className="sr-only">Sort</span>
          <select className={selectClassName} onChange={(event) => props.onSortChange(event.currentTarget.value)} value={props.sort}>
            {props.sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>

      {sheetOpen ? (
        <div className="fixed inset-0 z-[65] flex items-end bg-black/50 md:hidden" onMouseDown={(event) => { if (event.target === event.currentTarget) setSheetOpen(false); }}>
          <section aria-labelledby="filter-sheet-title" aria-modal="true" className={`${sheetPanelClass} max-h-[88dvh] overflow-y-auto`} ref={sheetRef} role="dialog" tabIndex={-1}>
            <SheetGrabber />
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-title-3 text-text" id="filter-sheet-title">Filter results</h2>
              <button aria-label="Close filters" className="flex size-11 items-center justify-center rounded-full bg-surface text-text-secondary" data-modal-initial-focus onClick={() => setSheetOpen(false)} type="button"><IconClose /></button>
            </div>
            <div className="space-y-4">{fields}</div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button onClick={() => clearFilters(props)} variant="secondary">Clear</Button>
              <Button onClick={() => setSheetOpen(false)}>Show results</Button>
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
        <summary className={`${selectClassName} flex cursor-pointer list-none items-center justify-between`}>
          Muscles{filters.muscleGroupIds.length > 0 ? ` (${filters.muscleGroupIds.length})` : ""}<IconChevronDown />
        </summary>
        <div className="mt-2 space-y-1 rounded-[var(--radius-card)] border border-line bg-surface p-2 md:absolute md:z-20 md:max-h-72 md:w-64 md:overflow-y-auto md:bg-surface-raised md:shadow-lg">
          {muscleOptions.map((muscle) => (
            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[var(--radius-control)] px-2 text-body text-text" key={muscle.id}>
              <input
                checked={filters.muscleGroupIds.includes(muscle.id)}
                className="size-5 accent-[var(--accent)]"
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
          <span className="mb-1 block text-subhead text-text-secondary">Editability</span>
          <select className={selectClassName} onChange={(event) => onChange({ ...filters, ownership: event.currentTarget.value as FacetFilterValue["ownership"] })} value={filters.ownership}>
            <option value="">All</option>
            <option value="editable">Editable by me</option>
            <option value="readOnly">Read-only</option>
          </select>
        </label>
      ) : null}
      <label className="hidden md:block md:w-44">
        <span className="mb-1 block text-subhead text-text-secondary">Sort</span>
        <select className={selectClassName} onChange={(event) => onSortChange(event.currentTarget.value)} value={sort}>
          {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <button className="hidden min-h-11 px-2 text-subhead text-accent md:block" onClick={() => onClear ? onClear() : onChange(emptyFacetFilters())} type="button">Clear</button>
    </>
  );
}

function SelectFilter({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: string[]; value: string }): ReactNode {
  return (
    <label className="block md:w-48">
      <span className="mb-1 block text-subhead text-text-secondary">{label}</span>
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

const selectClassName = "min-h-11 w-full rounded-[var(--radius-control)] border border-control-line bg-surface px-3 text-body text-text";
