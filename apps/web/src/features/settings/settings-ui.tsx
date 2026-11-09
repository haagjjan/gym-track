"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";

/** Inset grouped list container (DESIGN.md, Components). Children are rows. */
export function Group({ children, label }: { children: ReactNode; label?: string }): ReactNode {
  return <div aria-label={label} className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface" role={label ? "group" : undefined}>{children}</div>;
}

export function Row({ children, className = "" }: { children: ReactNode; className?: string }): ReactNode {
  return <div className={`min-h-11 px-4 py-3 ${className}`}>{children}</div>;
}

/** Section heading above a group; also names the section for assistive tech. */
export function Section({ children, title }: { children: ReactNode; title: string }): ReactNode {
  const id = `settings-${title.toLowerCase().replaceAll(/[^a-z]+/g, "-")}`;
  return <section aria-labelledby={id} className="space-y-2"><h2 className="px-4 text-footnote text-text-secondary" id={id}>{title}</h2>{children}</section>;
}

/** Brief "Saved" confirmation: call `flash()` after a successful save. */
export function useSavedFlash(): { flash: () => void; saved: boolean } {
  const [saved, setSaved] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const flash = useCallback(() => {
    setSaved(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSaved(false), 1600);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { flash, saved };
}

export function SavedStatus({ saved }: { saved: boolean }): ReactNode {
  return <p className="min-h-5 text-footnote text-success" role="status">{saved ? "Saved" : ""}</p>;
}

export function SwitchRow({ checked, disabled = false, label, note, onChange }: { checked: boolean; disabled?: boolean; label: string; note?: string; onChange: (value: boolean) => void }): ReactNode {
  const labelId = useId();
  const noteId = useId();
  return (
    <Row className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-body text-text" id={labelId}>{label}</p>
        {note ? <p className="text-footnote text-text-secondary" id={noteId}>{note}</p> : null}
      </div>
      <button
        aria-checked={checked}
        aria-describedby={note ? noteId : undefined}
        aria-labelledby={labelId}
        className="-my-1 flex min-h-11 min-w-[3.5rem] shrink-0 items-center justify-center disabled:opacity-50"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        role="switch"
        type="button"
      >
        <span aria-hidden className={`relative h-8 w-[3.25rem] rounded-full transition-colors duration-[120ms] ${checked ? "bg-accent" : "bg-control-line"}`}>
          <span className={`absolute left-0.5 top-0.5 size-7 rounded-full bg-white shadow transition-transform duration-[120ms] ${checked ? "translate-x-5" : "translate-x-0"}`} />
        </span>
      </button>
    </Row>
  );
}

export const inputClass = "min-h-[3.125rem] w-full rounded-[var(--radius-control)] border border-control-line bg-surface-raised px-3 text-body text-text focus:border-accent focus:outline-none";
