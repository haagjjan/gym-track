"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { HudButton } from "../../shared/ui/ui";

const columns = [
  ["workout_started_at", "Required ISO 8601 timestamp with offset"],
  ["workout_ended_at", "Required ISO 8601 timestamp after the start"],
  ["workout_type", "Optional, up to 50 characters"],
  ["workout_title", "Optional, up to 120 characters"],
  ["workout_notes", "Optional workout note"],
  ["exercise_name", "Required exercise name"],
  ["primary_muscle_group_slug", "Required seeded muscle slug"],
  ["equipment", "Optional canonical equipment value"],
  ["exercise_type", "Optional canonical exercise type"],
  ["exercise_position", "Required compact positive integer, starting at 1"],
  ["set_order", "Required compact positive integer per exercise, starting at 1"],
  ["set_type", "Required: working or warmup"],
  ["weight_kg", "Required: 0.01–9999.99, up to 2 decimals"],
  ["reps", "Required positive whole number"],
  ["rir", "Required whole number from 0–10"],
  ["rest_time_seconds", "Optional non-negative whole number"],
  ["set_note", "Optional set note"]
] as const;

const header = columns.map(([name]) => name).join(",");
const example = "2026-07-10T17:00:00.000Z,2026-07-10T18:00:00.000Z,upper,Push Day,,Bench Press,chest,barbell,compound,1,1,working,80,8,2,120,Controlled reps";
const sampleCsv = `${header}\n${example}\n`;

const equipment = "barbell, dumbbell, kettlebell, cable, machine, plate-loaded machine, Smith machine, resistance band, bodyweight, other";
const exerciseTypes = "compound, isolation, isometric, other";
const muscleSlugs = "chest, back, shoulders, biceps, triceps, forearms, quads, hamstrings, glutes, calves, abs, traps";

export function CsvFormatDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }): ReactNode {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-void/75 backdrop-blur-sm sm:items-center sm:p-4">
      <section aria-labelledby="csv-format-title" aria-modal="true" className="glass max-h-[92dvh] w-full overflow-y-auto rounded-t-xl border border-lavender/30 p-4 pb-[max(env(safe-area-inset-bottom),1rem)] sm:max-w-3xl sm:rounded-xl" role="dialog">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="label-caps text-lavender">IMPORT FORMAT</p>
            <h2 className="font-display text-xl font-bold text-fg" id="csv-format-title">Workout CSV guide</h2>
          </div>
          <button aria-label="Close CSV format guide" className="flex size-11 shrink-0 items-center justify-center rounded border border-outline-dim text-xl text-fg-muted hover:border-cyan hover:text-cyan" onClick={onClose} ref={closeButtonRef} type="button">×</button>
        </header>

        <div className="mt-4 space-y-4 text-xs leading-5 text-fg-muted">
          <p>Use one row per set. Repeat workout and exercise fields on every row, keep exercise positions and set orders compact, and save the file as UTF-8 CSV.</p>
          <GuideValues label="Muscle slugs" value={muscleSlugs} />
          <GuideValues label="Equipment" value={equipment} />
          <GuideValues label="Exercise types" value={exerciseTypes} />

          <div className="overflow-x-auto rounded border border-outline-dim/60">
            <table className="w-full min-w-[620px] border-collapse text-left">
              <thead className="bg-surface-low"><tr><th className="px-3 py-2 text-fg">Column</th><th className="px-3 py-2 text-fg">Expected value</th></tr></thead>
              <tbody>{columns.map(([name, rule]) => <tr className="border-t border-outline-dim/40" key={name}><td className="whitespace-nowrap px-3 py-2 font-mono text-cyan-dim">{name}</td><td className="px-3 py-2">{rule}</td></tr>)}</tbody>
            </table>
          </div>

          <div>
            <p className="label-caps mb-1 text-outline">EXAMPLE</p>
            <pre className="overflow-x-auto rounded border border-outline-dim/60 bg-surface-low p-3 text-[10px] leading-5 text-fg">{sampleCsv}</pre>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <a className="inline-flex min-h-11 items-center justify-center rounded border border-cyan/40 px-4 font-display text-xs font-bold uppercase tracking-[0.1em] text-cyan hover:border-cyan" download="gym-workouts-sample.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent(sampleCsv)}`}>Download sample CSV</a>
          <HudButton onClick={onClose} variant="ghost">Close</HudButton>
        </div>
      </section>
    </div>,
    document.body
  );
}

function GuideValues({ label, value }: { label: string; value: string }): ReactNode {
  return <p><strong className="text-fg">{label}:</strong> {value}. Leave optional classifications blank when unknown.</p>;
}
