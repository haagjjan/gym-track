"use client";

import type { ReactNode } from "react";
import { Button, buttonClass } from "../../shared/ui/button";
import { Sheet } from "../../shared/ui/sheet";

const columns = [
  ["workout_started_at", "Required ISO 8601 timestamp with offset"],
  ["workout_ended_at", "Required ISO 8601 timestamp after the start"],
  ["workout_type", "Optional, up to 50 characters"],
  ["workout_title", "Optional, up to 120 characters"],
  ["workout_notes", "Optional workout note"],
  ["exercise_name", "Required exercise name"],
  ["primary_muscle_group_slug", "Required muscle group, such as chest or back"],
  ["equipment", "Optional canonical equipment value"],
  ["exercise_type", "Optional canonical exercise type"],
  ["exercise_position", "Required exercise order, starting at 1"],
  ["set_order", "Required set order within the exercise, starting at 1"],
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
const muscleGroups = "chest, back, shoulders, biceps, triceps, forearms, quads, hamstrings, glutes, calves, abs, traps";

export function CsvFormatDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }): ReactNode {
  return (
    <Sheet className="max-h-[92dvh] overflow-y-auto" isOpen={isOpen} labelledBy="csv-format-title" onClose={onClose} portal width="3xl">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-title-2 text-text" id="csv-format-title">Workout CSV guide</h2>
        <button aria-label="Close CSV format guide" className="flex size-11 shrink-0 items-center justify-center rounded-full text-title-2 text-text-secondary active:opacity-70" data-modal-initial-focus onClick={onClose} type="button">×</button>
      </header>

      <div className="mt-4 space-y-4 text-subhead text-text-secondary">
        <p>Use one row per set. Repeat the workout and exercise fields on every row, keep exercise positions and set orders in sequence, and save the file as UTF-8 CSV.</p>
        <p>Exports escape spreadsheet-formula prefixes, so text you wrote opens as plain text, not as a formula.</p>
        <GuideValues label="Muscle groups" value={muscleGroups} />
        <GuideValues label="Equipment" value={equipment} />
        <GuideValues label="Exercise types" value={exerciseTypes} />

        <div className="overflow-x-auto rounded-[var(--radius-control)] bg-surface">
          <table className="w-full min-w-[620px] border-collapse text-left">
            <thead><tr><th className="px-3 py-2 text-headline text-text">Column</th><th className="px-3 py-2 text-headline text-text">Expected value</th></tr></thead>
            <tbody>{columns.map(([name, rule]) => <tr className="border-t border-line" key={name}><td className="whitespace-nowrap px-3 py-2 text-text">{name}</td><td className="px-3 py-2">{rule}</td></tr>)}</tbody>
          </table>
        </div>

        <div>
          <p className="mb-1 text-headline text-text">Example</p>
          <pre className="overflow-x-auto rounded-[var(--radius-control)] bg-surface p-3 text-caption text-text">{sampleCsv}</pre>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <a className={buttonClass("secondary")} download="gym-workouts-sample.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent(sampleCsv)}`}>Download sample CSV</a>
        <Button onClick={onClose} variant="primary">Close</Button>
      </div>
    </Sheet>
  );
}

function GuideValues({ label, value }: { label: string; value: string }): ReactNode {
  return <p><strong className="text-text">{label}:</strong> {value}. Leave optional fields blank when unknown.</p>;
}
