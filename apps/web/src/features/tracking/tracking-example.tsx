"use client";

import { useState, type ReactNode } from "react";
import { Button } from "../../shared/ui/button";
import { TimedSetForm } from "./timed-set-form";
import { CardioForm } from "./cardio-form";
import { paceLabel } from "./tracking-types";

/** Local practice only: no account writes or server requests. */
export function TrackingExample(): ReactNode {
  const [kind, setKind] = useState<"time" | "cardio">("time");
  const [result, setResult] = useState("");
  return <section className="space-y-3 rounded-[var(--radius-card)] bg-surface p-4" aria-label="Time and cardio example">
    <h2 className="text-title-3 text-text">Try time and cardio</h2>
    <p className="text-subhead text-text-secondary">Example only. Nothing here is saved to your account. A time set records seconds and optional added weight. Cardio stays out of muscle volume.</p>
    <div className="flex gap-2"><Button aria-pressed={kind === "time"} onClick={() => setKind("time")} variant="secondary">Time set</Button><Button aria-pressed={kind === "cardio"} onClick={() => setKind("cardio")} variant="secondary">Cardio</Button></div>
    {kind === "time" ? <TimedSetForm catalog={[{ id: "demo-hang", name: "Dead hang" }]} pending={false} onSave={async (values) => setResult(`Example saved: ${values.durationSeconds} seconds${values.addedWeightKg ? ` + ${values.addedWeightKg} kg` : ""}.`)} /> :
      <CardioForm pending={false} onSave={async (values) => setResult(`Example saved: ${values.activity}, ${values.durationSeconds} seconds${values.distanceMetres ? `, ${paceLabel(values.durationSeconds, values.distanceMetres)}` : ""}.`)} />}
    {result ? <p className="break-words text-body text-text" role="status">{result}</p> : null}
  </section>;
}
