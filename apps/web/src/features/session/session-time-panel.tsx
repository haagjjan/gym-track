"use client";

import { useState, type ReactNode } from "react";
import { errorMessage } from "../../shared/api/client";
import { formatMinutes } from "../../shared/format";
import { Button } from "../../shared/ui/button";
import { Sheet } from "../../shared/ui/sheet";
import { MAX_WORKOUT_MINUTES, resolveWorkoutTime, toWorkoutTimeDraft, type WorkoutTimeDraft } from "./workout-time";

/**
 * Edit a finished workout's time: one date, a start and a finish time. A
 * finish before the start means it ran past midnight. Opens from the pencil
 * next to Duration.
 */
export function WorkoutTimeSheet({
  endedAt,
  isOpen,
  isSaving,
  onClose,
  onSave,
  startedAt
}: {
  endedAt: string;
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: (startedAtIso: string, endedAtIso: string) => Promise<unknown>;
  startedAt: string;
}): ReactNode {
  return (
    <Sheet isOpen={isOpen} labelledBy="workout-time-title" onClose={onClose} portal width="md">
      {/* Remount per opening so the fields start from the saved times. */}
      {isOpen ? <TimeForm endedAt={endedAt} isSaving={isSaving} onClose={onClose} onSave={onSave} startedAt={startedAt} /> : null}
    </Sheet>
  );
}

function TimeForm({ endedAt, isSaving, onClose, onSave, startedAt }: {
  endedAt: string;
  isSaving: boolean;
  onClose: () => void;
  onSave: (startedAtIso: string, endedAtIso: string) => Promise<unknown>;
  startedAt: string;
}): ReactNode {
  const [draft, setDraft] = useState<WorkoutTimeDraft>(() => toWorkoutTimeDraft(startedAt, endedAt));
  const [error, setError] = useState<string | null>(null);
  const resolved = resolveWorkoutTime(draft);
  const update = (patch: Partial<WorkoutTimeDraft>): void => setDraft((current) => ({ ...current, ...patch }));

  async function save(): Promise<void> {
    if (!resolved.ok) return;
    setError(null);
    try {
      await onSave(resolved.startedAt, resolved.endedAt);
      onClose();
    } catch (caught) {
      setError(errorMessage(caught, "Couldn't change the time. Check your connection and try again."));
    }
  }

  return (
    <>
      {/* Focus the title, not the date field: focusing a date input on iOS can open its picker at once. */}
      <h2 className="mt-1 text-title-3 text-text outline-none" data-modal-initial-focus id="workout-time-title" tabIndex={-1}>Workout time</h2>
      <div className="mt-4 space-y-3">
        <TimeField label="Date" onChange={(date) => update({ date })} type="date" value={draft.date} />
        <div className="grid grid-cols-2 gap-3">
          <TimeField label="Start" onChange={(start) => update({ start })} type="time" value={draft.start} />
          <TimeField label="Finish" onChange={(end) => update({ end })} type="time" value={draft.end} />
        </div>
      </div>
      <p aria-live="polite" className={`mt-3 text-subhead ${resolved.ok ? "text-text-secondary" : "text-danger"}`} role={resolved.ok ? undefined : "alert"}>
        {resolved.ok
          ? `${formatMinutes(resolved.startedAt, resolved.endedAt)}${resolved.nextDay ? ", finishing the next day" : ""}`
          : resolved.reason === "too-long"
            ? `A workout can be at most ${MAX_WORKOUT_MINUTES / 60} hours.`
            : resolved.reason === "same-time"
              ? "Set a finish time after the start."
              : "Enter a date, a start and a finish."}
      </p>
      {error ? <p className="mt-2 text-subhead text-danger" role="alert">{error}</p> : null}
      <div className="mt-4 grid gap-2">
        <Button disabled={!resolved.ok || isSaving} onClick={() => void save()}>{isSaving ? "Saving…" : "Save"}</Button>
        <Button onClick={onClose} variant="plain">Cancel</Button>
      </div>
    </>
  );
}

function TimeField({ label, onChange, type, value }: { label: string; onChange: (value: string) => void; type: "date" | "time"; value: string }): ReactNode {
  return (
    <label className="block min-w-0">
      <span className="text-subhead text-text-secondary">{label}</span>
      {/* min-w-0 + w-full: iOS gives date/time inputs a wide intrinsic size that overflowed the card. */}
      <input
        className="time-field num mt-1.5 block h-[3.125rem] w-full min-w-0 appearance-none rounded-[var(--radius-control)] border border-control-line bg-surface-raised px-3 text-left text-body text-text"
        onChange={(event) => onChange(event.currentTarget.value)}
        required
        type={type}
        value={value}
      />
    </label>
  );
}
