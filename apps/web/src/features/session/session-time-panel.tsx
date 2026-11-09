"use client";

import { useState, type ReactNode } from "react";
import { Button } from "../../shared/ui/button";
import { errorMessage } from "../../shared/api/client";
import { formatDayTime, formatMinutes } from "../../shared/format";

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
    setExpanded(true);
  }

  async function commit(): Promise<void> {
    if (!nextStartedAt || !nextEndedAt) return;
    setError(null);

    try {
      await onSave(nextStartedAt, nextEndedAt);
      setExpanded(false);
    } catch (caught) {
      setError(errorMessage(caught, "Couldn't change the times. Check your connection and try again."));
    }
  }

  return (
    <section aria-labelledby="workout-time-heading">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-body text-text" id="workout-time-heading">Workout time</h3>
          <p className="mt-0.5 text-subhead text-text-secondary">
            {timeRange(startedAt, endedAt)}, {formatMinutes(startedAt, endedAt)}
          </p>
        </div>
        {!expanded ? <Button onClick={open} size="compact" variant="plain">Change</Button> : null}
      </div>

      {expanded ? (
        <div className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <DateTimeField label="Started" onChange={setStartDraft} value={startDraft} />
            <DateTimeField label="Finished" onChange={setEndDraft} value={endDraft} />
          </div>
          {!valid ? <p className="text-subhead text-danger" role="alert">The finish can&apos;t be before the start.</p> : null}
          <p className="text-subhead text-text-secondary">Changing the times moves this workout in your history and stats.</p>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Button disabled={!valid || isSaving} onClick={() => void commit()} variant="secondary">{isSaving ? "Saving…" : "Save times"}</Button>
            <Button onClick={() => setExpanded(false)} variant="plain">Cancel</Button>
          </div>
        </div>
      ) : null}
      {error ? <p className="mt-2 text-subhead text-danger" role="alert">{error}</p> : null}
    </section>
  );
}

function timeRange(startedAt: string, endedAt: string): string {
  const start = formatDayTime(startedAt);
  const end = formatDayTime(endedAt);
  const [startDay] = start.split(", ");
  const [endDay, endTime] = end.split(", ");
  return startDay === endDay ? `${start} to ${endTime ?? ""}` : `${start} to ${end}`;
}

function DateTimeField({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }): ReactNode {
  return (
    <label className="block">
      <span className="text-subhead text-text-secondary">{label}</span>
      <input className="num mt-1.5 min-h-[3.125rem] w-full rounded-[var(--radius-control)] border border-control-line bg-surface-raised px-3 text-body text-text" onChange={(event) => onChange(event.currentTarget.value)} type="datetime-local" value={value} />
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
