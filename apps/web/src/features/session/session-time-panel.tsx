"use client";

import { useState, type ReactNode } from "react";
import { HudButton } from "../../shared/ui/ui";
import { errorMessage } from "../../shared/api/client";
import { formatDateTime, formatDuration } from "../../shared/format";

export function SessionTimePanel({
  endedAt,
  isSaving,
  onSave,
  startedAt
}: {
  endedAt: string;
  isSaving: boolean;
  onSave: (startedAtIso: string, endedAtIso: string) => Promise<unknown>;
  startedAt: string;
}): ReactNode {
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [startDraft, setStartDraft] = useState("");
  const [endDraft, setEndDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const nextStartedAt = fromDateTimeInputValue(startDraft);
  const nextEndedAt = fromDateTimeInputValue(endDraft);
  const valid = Boolean(
    nextStartedAt &&
    nextEndedAt &&
    new Date(nextEndedAt).getTime() >= new Date(nextStartedAt).getTime()
  );

  function open(): void {
    setStartDraft(toDateTimeInputValue(startedAt));
    setEndDraft(toDateTimeInputValue(endedAt));
    setError(null);
    setConfirming(false);
    setExpanded(true);
  }

  async function commit(): Promise<void> {
    if (!nextStartedAt || !nextEndedAt) return;
    setError(null);

    try {
      await onSave(nextStartedAt, nextEndedAt);
      setExpanded(false);
      setConfirming(false);
    } catch (caught) {
      setError(errorMessage(caught, "The workout times could not be updated."));
    }
  }

  if (!expanded) {
    return (
      <section className="glass rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="label-caps text-outline">Workout time</p>
            <p className="mt-1 font-mono text-xs text-fg-muted">
              {formatDateTime(startedAt)} → {formatDateTime(endedAt)}
              <span className="ml-2 text-outline">({formatDuration(startedAt, endedAt)})</span>
            </p>
          </div>
          <HudButton onClick={open} size="sm" variant="outline">Adjust times</HudButton>
        </div>
      </section>
    );
  }

  return (
    <section className="glass rounded-xl border border-lavender/40 p-4">
      <p className="label-caps text-lavender">Adjust workout times</p>
      {confirming && valid && nextStartedAt && nextEndedAt ? (
        <div className="mt-3 space-y-3">
          <div className="rounded border border-lavender/40 bg-lavender/5 p-3 text-xs">
            <p className="text-fg-muted">From {formatDateTime(startedAt)} → {formatDateTime(endedAt)}</p>
            <p className="mt-1.5 text-fg">To {formatDateTime(nextStartedAt)} → {formatDateTime(nextEndedAt)}</p>
          </div>
          <div className="flex gap-2">
            <HudButton className="flex-1" disabled={isSaving} onClick={() => void commit()} size="sm" variant="danger">
              {isSaving ? "SAVING…" : "CONFIRM TIME EDIT"}
            </HudButton>
            <HudButton onClick={() => setConfirming(false)} size="sm" variant="ghost">Back</HudButton>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <DateTimeField label="Started at" onChange={setStartDraft} value={startDraft} />
            <DateTimeField label="Ended at" onChange={setEndDraft} value={endDraft} />
          </div>
          {!valid ? <p className="text-xs text-red">The end must not be before the start.</p> : null}
          <div className="flex gap-2">
            <HudButton className="flex-1" disabled={!valid} onClick={() => setConfirming(true)} size="sm">Review changes</HudButton>
            <HudButton onClick={() => setExpanded(false)} size="sm" variant="ghost">Cancel</HudButton>
          </div>
        </div>
      )}
      {error ? <p className="mt-2 text-xs text-red">{error}</p> : null}
    </section>
  );
}

function DateTimeField({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }): ReactNode {
  return (
    <label className="block">
      <span className="label-caps text-outline">{label}</span>
      <input className="mt-1 min-h-11 w-full rounded border border-outline-dim bg-surface-low/60 px-3 font-mono text-sm text-fg focus:border-cyan focus:outline-none" onChange={(event) => onChange(event.currentTarget.value)} type="datetime-local" value={value} />
    </label>
  );
}

function toDateTimeInputValue(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDateTimeInputValue(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
