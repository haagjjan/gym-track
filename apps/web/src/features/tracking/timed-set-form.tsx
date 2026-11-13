"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "../../shared/ui/button";
import type { TimedEntry, TimedValues } from "./tracking-types";

export const trackingInputClass = "mt-1 block min-h-11 w-full rounded-[var(--radius-control)] border border-control-line bg-surface-raised px-3 text-body text-text";

export function TimedSetForm({ catalog, entry, pending, onSave }: {
  catalog: { id: string; name: string }[]; entry?: TimedEntry | undefined; pending: boolean;
  onSave: (values: TimedValues) => Promise<void>;
}): ReactNode {
  const [seconds, setSeconds] = useState(entry?.durationSeconds ?? 30);
  const [exerciseId, setExerciseId] = useState(entry?.exerciseId ?? catalog[0]?.id ?? "");
  const [weight, setWeight] = useState(entry?.addedWeightKg ?? "");
  const [setType, setSetType] = useState<"warmup" | "working">(entry?.setType ?? "working");
  const [note, setNote] = useState(entry?.note ?? "");
  const [timer, setTimer] = useState<{ started: number; base: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  const duration = timer ? timer.base + Math.floor((now - timer.started) / 1000) : seconds;
  useEffect(() => {
    if (!timer) return;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [timer]);
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const elapsed = timer ? timer.base + Math.floor((Date.now() - timer.started) / 1000) : seconds;
    setTimer(null); setSeconds(elapsed);
    await onSave({ exerciseId, durationSeconds: elapsed, setType, addedWeightKg: weight === "" ? null : weight, note: note || null });
  }
  return <form onSubmit={(event) => void submit(event)}>
    <fieldset className="space-y-3" disabled={pending}>
      <legend className="mb-3 text-headline text-text">{entry ? "Edit time set" : "Log a time set"}</legend>
      <label className="block text-subhead text-text-secondary">Exercise<select aria-label="Exercise" className={trackingInputClass} onChange={(event) => setExerciseId(event.target.value)} required value={exerciseId}>
        {catalog.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}
      </select></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-subhead text-text-secondary">Seconds<input className={trackingInputClass} disabled={timer !== null} inputMode="numeric" max={86400} min={1} onChange={(event) => setSeconds(Number(event.target.value))} required step={1} type="number" value={duration} /></label>
        <label className="text-subhead text-text-secondary">Added weight (kg)<input className={trackingInputClass} inputMode="decimal" max={9999.99} min={0} onChange={(event) => setWeight(event.target.value)} placeholder="Optional" step="0.01" type="number" value={weight} /></label>
      </div>
      <Button onClick={() => {
        if (timer) { setSeconds(timer.base + Math.floor((Date.now() - timer.started) / 1000)); setTimer(null); }
        else { setNow(Date.now()); setTimer({ started: Date.now(), base: 0 }); }
      }} type="button" variant="secondary">{timer ? "Stop timer" : "Start timer"}</Button>
      <label className="block text-subhead text-text-secondary">Set type<select aria-label="Set type" className={trackingInputClass} onChange={(event) => setSetType(event.target.value as "warmup" | "working")} value={setType}><option value="working">Working</option><option value="warmup">Warmup</option></select></label>
      <label className="block text-subhead text-text-secondary">Note<input className={trackingInputClass} maxLength={1000} onChange={(event) => setNote(event.target.value)} value={note} /></label>
      <Button disabled={!exerciseId || duration < 1 || duration > 86400} type="submit">{pending ? "Saving…" : "Save time set"}</Button>
    </fieldset>
  </form>;
}
