"use client";

import { useState, type ReactNode } from "react";
import { Button } from "../../shared/ui/button";
import { Stepper } from "../../shared/ui/stepper";
import { DurationInput } from "./duration-input";
import { EntryActions, NoteField, type EntryFormProps } from "./entry-form-parts";
import type { CardioEntry, CardioValues } from "./tracking-types";

/** Cardio: duration first, distance beside it, the rest behind "More details". */
export function CardioForm({ entry, exerciseId, initial, onCancel, onDelete, onSave, pending, title }: EntryFormProps<CardioEntry, CardioValues>): ReactNode {
  const from = entry ?? initial;
  const [seconds, setSeconds] = useState(from?.durationSeconds ?? 1200);
  const [distance, setDistance] = useState(from?.distanceMetres ? String(Number((Number(from.distanceMetres) / 1000).toFixed(2))) : "0");
  const [calories, setCalories] = useState(entry?.calories ? String(entry.calories) : "0");
  const [heartRate, setHeartRate] = useState(entry?.averageHeartRate ? String(entry.averageHeartRate) : "0");
  const [note, setNote] = useState(entry?.note ?? "");
  const [more, setMore] = useState(Boolean(entry?.calories || entry?.averageHeartRate || entry?.note));
  const km = Number(distance || 0);
  const kcal = Number(calories || 0);
  const bpm = Number(heartRate || 0);
  const valid = seconds >= 1 && Number.isFinite(km) && km >= 0 && km <= 1000
    && Number.isInteger(kcal) && kcal >= 0 && kcal <= 20000 && Number.isInteger(bpm) && (bpm === 0 || (bpm >= 20 && bpm <= 300));

  function save(): void {
    onSave({ exerciseId, durationSeconds: seconds, distanceMetres: km > 0 ? (km * 1000).toFixed(2) : null,
      calories: kcal > 0 ? kcal : null, averageHeartRate: bpm > 0 ? bpm : null, note: note.trim() || null });
  }

  return (
    <section aria-label={title} data-set-inputs>
      <h2 className="mb-3 text-title-3 text-text">{title}</h2>
      <DurationInput onChange={setSeconds} step={60} value={seconds} />
      <div className="mt-4"><Stepper decimals label="Distance" onChange={setDistance} step={0.5} unit="km" value={distance} /></div>
      {more ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Stepper label="Calories" onChange={setCalories} step={10} unit="kcal" value={calories} />
            <Stepper label="Avg heart rate" onChange={setHeartRate} step={1} unit="bpm" value={heartRate} />
          </div>
          <NoteField onChange={setNote} open value={note} />
        </>
      ) : (
        <Button className="mt-2 -ml-4" onClick={() => setMore(true)} size="compact" variant="plain">More details</Button>
      )}
      <p className="mt-2 text-footnote text-text-secondary">Leave a value at 0 to skip it.</p>
      <EntryActions canSave={valid} isEdit={Boolean(entry)} noun="entry" onCancel={onCancel} onDelete={onDelete} onSave={save} pending={pending} />
    </section>
  );
}
