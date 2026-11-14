"use client";

import { useState, type ReactNode } from "react";
import { Segmented } from "../progress/progress-segmented";
import { TimedSetForm } from "./timed-set-form";
import { CardioForm } from "./cardio-form";
import { formatDuration, paceLabel } from "./tracking-types";

/** Local practice only: no account writes or server requests. */
export function TrackingExample(): ReactNode {
  const [kind, setKind] = useState<"time" | "cardio">("time");
  const [result, setResult] = useState("");
  return <section className="space-y-3 rounded-[var(--radius-card)] bg-surface p-4" aria-label="Time and cardio example">
    <h2 className="text-title-3 text-text">Try time and cardio</h2>
    <p className="text-subhead text-text-secondary">Example only. Nothing here is saved to your account. A time set records minutes and seconds, with optional added weight. Cardio stays out of muscle volume.</p>
    <Segmented label="Example type" onChange={setKind} options={[{ label: "Time set", value: "time" }, { label: "Cardio", value: "cardio" }]} value={kind} />
    {kind === "time" ? <TimedSetForm exerciseId="demo-hang" onCancel={() => setResult("")} pending={false} title="Dead hang" onSave={(values) => setResult(`Example saved: ${formatDuration(values.durationSeconds)}${values.addedWeightKg ? ` + ${values.addedWeightKg} kg` : ""}.`)} /> :
      <CardioForm exerciseId="demo-run" onCancel={() => setResult("")} pending={false} title="Treadmill run" onSave={(values) => setResult(`Example saved: ${formatDuration(values.durationSeconds)}${values.distanceMetres ? `, ${paceLabel(values.durationSeconds, values.distanceMetres)}` : ""}.`)} />}
    {result ? <p className="break-words text-body text-text" role="status">{result}</p> : null}
  </section>;
}
