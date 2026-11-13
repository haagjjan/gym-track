"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "../../shared/ui/button";
import { trackingInputClass } from "./timed-set-form";
import type { CardioEntry, CardioValues } from "./tracking-types";

export function CardioForm({ entry, pending, onSave }: {
  entry?: CardioEntry | undefined; pending: boolean; onSave: (values: CardioValues) => Promise<void>;
}): ReactNode {
  const [activity, setActivity] = useState(entry?.activity ?? "Running");
  const [seconds, setSeconds] = useState(entry?.durationSeconds ?? 1200);
  const [distance, setDistance] = useState(entry?.distanceMetres ? String(Number(entry.distanceMetres) / 1000) : "");
  const [heartRate, setHeartRate] = useState(entry?.averageHeartRate?.toString() ?? "");
  const [note, setNote] = useState(entry?.note ?? "");
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await onSave({ activity, durationSeconds: seconds, distanceMetres: distance === "" ? null : (Number(distance) * 1000).toFixed(2),
      averageHeartRate: heartRate === "" ? null : Number(heartRate), note: note || null });
  }
  return <form onSubmit={(event) => void submit(event)}><fieldset className="space-y-3" disabled={pending}>
    <legend className="mb-3 text-headline text-text">{entry ? "Edit cardio" : "Log cardio"}</legend>
    <label className="block text-subhead text-text-secondary">Activity<input className={trackingInputClass} maxLength={100} onChange={(event) => setActivity(event.target.value)} required value={activity} /></label>
    <div className="grid grid-cols-2 gap-3">
      <label className="text-subhead text-text-secondary">Seconds<input className={trackingInputClass} inputMode="numeric" max={86400} min={1} onChange={(event) => setSeconds(Number(event.target.value))} required step={1} type="number" value={seconds} /></label>
      <label className="text-subhead text-text-secondary">Distance (km)<input className={trackingInputClass} inputMode="decimal" max={1000} min={0.00001} onChange={(event) => setDistance(event.target.value)} placeholder="Optional" step="0.00001" type="number" value={distance} /></label>
    </div>
    <label className="block text-subhead text-text-secondary">Average heart rate<input className={trackingInputClass} inputMode="numeric" max={300} min={20} onChange={(event) => setHeartRate(event.target.value)} placeholder="Optional" step={1} type="number" value={heartRate} /></label>
    <label className="block text-subhead text-text-secondary">Note<input className={trackingInputClass} maxLength={1000} onChange={(event) => setNote(event.target.value)} value={note} /></label>
    <Button type="submit">{pending ? "Saving…" : "Save cardio"}</Button>
  </fieldset></form>;
}
