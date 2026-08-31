"use client";

import { useId, type ReactNode } from "react";

/**
 * Filter controls shared by every administration section.
 *
 * The console lists grow with the beta, so each section filters client-side
 * over the rows it already holds. That keeps filtering instant and avoids
 * adding query parameters to endpoints that intentionally return a bounded
 * page of rows.
 */
export function FilterBar({ children }: { children: ReactNode }): ReactNode {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-outline-dim/50 bg-surface-low/30 p-3">
      {children}
    </div>
  );
}

export function SearchFilter({
  label,
  onChange,
  placeholder,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}): ReactNode {
  const id = useId();

  return (
    <div className="min-w-0 flex-1 basis-56">
      <label className="label-caps block text-outline" htmlFor={id}>{label}</label>
      <input
        className="mt-1 min-h-11 w-full min-w-0 rounded border border-outline-dim bg-surface-low px-3 text-sm text-fg placeholder:text-outline focus:border-cyan focus:outline-none"
        id={id}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholder}
        type="search"
        value={value}
      />
    </div>
  );
}

export function SelectFilter({
  label,
  onChange,
  options,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  options: readonly string[];
  value: string;
}): ReactNode {
  const id = useId();

  return (
    <div className="min-w-0 basis-40">
      <label className="label-caps block text-outline" htmlFor={id}>{label}</label>
      <select
        className="mt-1 min-h-11 w-full min-w-0 rounded border border-outline-dim bg-surface-low px-2 text-sm text-fg focus:border-cyan focus:outline-none"
        id={id}
        onChange={(event) => onChange(event.currentTarget.value)}
        value={value}
      >
        <option value="ALL">All</option>
        {options.map((option) => (
          <option key={option} value={option}>{humanise(option)}</option>
        ))}
      </select>
    </div>
  );
}

export function ResultCount({ shown, total, noun }: { shown: number; total: number; noun: string }): ReactNode {
  return (
    <p className="basis-full text-[11px] text-outline">
      Showing {shown} of {total} {noun}{total === 1 ? "" : "s"}.
    </p>
  );
}

/** Turns a stored enum such as `DELETION_PENDING` into `Deletion pending`. */
export function humanise(value: string): string {
  const spaced = value.replaceAll("_", " ").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Case-insensitive "does any of these fields contain the query" match. */
export function matchesSearch(query: string, ...fields: Array<string | null | undefined>): boolean {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return true;
  return fields.some((field) => field?.toLowerCase().includes(needle));
}
