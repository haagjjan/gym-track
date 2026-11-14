"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "../../shared/ui/button";
import { Stepper } from "../../shared/ui/stepper";
import { SetTypeControl } from "../session/set-composer";
import { DurationInput } from "./duration-input";
import { EntryActions, NoteField, type EntryFormProps } from "./entry-form-parts";
import type { TimedEntry, TimedValues } from "./tracking-types";

export const trackingInputClass = "mt-1 block min-h-11 w-full rounded-[var(--radius-control)] border border-control-line bg-surface-raised px-3 text-body text-text";

/** A hold: duration with a start/stop timer, and optional added weight. */
export function TimedSetForm({ entry, exerciseId, initial, onCancel, onDelete, onSave, pending, title }: EntryFormProps<TimedEntry, TimedValues>): ReactNode {
  const from = entry ?? initial;
  const [seconds, setSeconds] = useState(from?.durationSeconds ?? 30);
  const [weight, setWeight] = useState(from?.addedWeightKg ? String(Number(from.addedWeightKg)) : "0");
  const [setType, setSetType] = useState<"warmup" | "working">(entry?.setType ?? "working");
  const [note, setNote] = useState(entry?.note ?? "");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const running = startedAt !== null;
  const shown = running ? Math.max(0, Math.floor((now - startedAt) / 1000)) : seconds;
  const weightValid = /^\d+(\.\d{1,2})?$/.test(weight.trim() || "0") && Number(weight || 0) < 10000;

  useEffect(() => {
    if (startedAt === null) return;
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [startedAt]);

  function toggleTimer(): void {
    if (startedAt === null) { setNow(Date.now()); setStartedAt(Date.now()); return; }
    setSeconds(Math.max(1, Math.floor((Date.now() - startedAt) / 1000)));
    setStartedAt(null);
  }

  function save(): void {
    const durationSeconds = startedAt !== null ? Math.max(1, Math.floor((Date.now() - startedAt) / 1000)) : seconds;
    setStartedAt(null); setSeconds(durationSeconds);
    onSave({ exerciseId, durationSeconds, setType, addedWeightKg: Number(weight || 0) > 0 ? weight.trim() : null, note: note.trim() || null });
  }

  return (
    <section aria-label={title} data-set-inputs>
      <h2 className="mb-3 text-title-3 text-text">{title}</h2>
      <SetTypeControl onChange={setSetType} value={setType} />
      <div className="mt-4"><DurationInput disabled={running} onChange={setSeconds} step={5} value={shown} /></div>
      <Button className="mt-2 w-full" onClick={toggleTimer} variant="secondary">{running ? "Stop timer" : "Start timer"}</Button>
      <div className="mt-4"><Stepper decimals label="Added weight" onChange={setWeight} step={2.5} unit="kg" value={weight} /></div>
      <NoteField onChange={setNote} value={note} />
      <EntryActions canSave={shown >= 1 && weightValid} isEdit={Boolean(entry)} noun="set" onCancel={onCancel} onDelete={onDelete} onSave={save} pending={pending} />
    </section>
  );
}
