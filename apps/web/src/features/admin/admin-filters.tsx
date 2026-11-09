"use client";

import { useId, type ReactNode } from "react";

/**
 * Filter controls shared by every administration section.
 *
 * The console lists grow with the user base, so each section filters client-side
 * over the rows it already holds. That keeps filtering instant and avoids
 * adding query parameters to endpoints that intentionally return a bounded
 * page of rows.
 */
export function FilterBar({ children }: { children: ReactNode }): ReactNode {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-[var(--radius-card)] border border-line bg-surface-raised p-3">
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
      <label className="block text-subhead text-text-secondary" htmlFor={id}>{label}</label>
      <input
        className="mt-1 min-h-11 w-full min-w-0 rounded-[var(--radius-control)] border border-control-line bg-surface-raised px-3 text-callout text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
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
      <label className="block text-subhead text-text-secondary" htmlFor={id}>{label}</label>
      <select
        className="mt-1 min-h-11 w-full min-w-0 rounded-[var(--radius-control)] border border-control-line bg-surface-raised px-2 text-callout text-text focus:border-accent focus:outline-none"
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
    <p className="basis-full text-footnote text-text-muted">
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

/** A titled block on the console: one surface level, no nested bordered cards. */
export function AdminPanel({ children, title }: { children: ReactNode; title: string }): ReactNode {
  return (
    <section className="rounded-[var(--radius-card)] bg-surface p-4">
      <h3 className="mb-3 text-headline text-text">{title}</h3>
      {children}
    </section>
  );
}
