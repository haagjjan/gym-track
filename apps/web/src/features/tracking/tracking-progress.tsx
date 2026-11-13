"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { apiFetch } from "../../shared/api/client";
import { ErrorState, Skeleton } from "../../shared/ui/ui";
import { trackingInputClass } from "./timed-set-form";
import { TrackingChart, type TrackingPoint } from "./tracking-chart";
import { paceLabel, type TrackingPayload } from "./tracking-types";

export function TrackingProgress(): ReactNode {
  const query = useQuery({ queryKey: ["tracking-progress"], queryFn: () => apiFetch<TrackingPayload>("/api/tracking/progress") });
  const [kind, setKind] = useState<"time" | "cardio">("time");
  const [choice, setChoice] = useState("");
  const [metric, setMetric] = useState("duration");
  const names = new Map<string, string>();
  if (kind === "time") query.data?.timedSets.forEach((entry) => names.set(entry.exerciseId, entry.exerciseName));
  else query.data?.cardioEntries.forEach((entry) => names.set(entry.activity.toLowerCase(), entry.activity));
  const selected = names.has(choice) ? choice : names.keys().next().value ?? "";
  const points: TrackingPoint[] = kind === "time" ? (query.data?.timedSets ?? []).filter((entry) => entry.exerciseId === selected).map((entry) => ({
    id: entry.id, date: entry.sessionDate, value: metric === "load" ? Number(entry.addedWeightKg ?? 0) : entry.durationSeconds,
    detail: `${entry.durationSeconds} s${entry.addedWeightKg !== null ? ` + ${entry.addedWeightKg} kg` : ""}`
  })) : (query.data?.cardioEntries ?? []).filter((entry) => entry.activity.toLowerCase() === selected && (metric !== "distance" || entry.distanceMetres !== null)).map((entry) => ({
    id: entry.id, date: entry.sessionDate, value: metric === "distance" ? Number(entry.distanceMetres) / 1000 : entry.durationSeconds,
    detail: `${entry.durationSeconds} s${entry.distanceMetres ? ` / ${Number(entry.distanceMetres) / 1000} km (${paceLabel(entry.durationSeconds, entry.distanceMetres)})` : ""}`
  }));
  return <section className="mt-6 rounded-[var(--radius-card)] bg-surface p-4" aria-label="Time and cardio progress">
    <h2 className="text-title-3 text-text">Time and cardio</h2>
    {query.isLoading ? <Skeleton className="mt-3 h-52" /> : query.isError ? <ErrorState message="Couldn't load time and cardio progress." retry={() => void query.refetch()} /> : <>
      <label className="mt-3 block text-subhead text-text-secondary">Tracking<select aria-label="Tracking" className={trackingInputClass} onChange={(event) => { setKind(event.target.value as "time" | "cardio"); setChoice(""); setMetric("duration"); }} value={kind}><option value="time">Time sets</option><option value="cardio">Cardio</option></select></label>
      {names.size ? <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="text-subhead text-text-secondary">{kind === "time" ? "Exercise" : "Activity"}<select aria-label={kind === "time" ? "Exercise" : "Activity"} className={trackingInputClass} onChange={(event) => setChoice(event.target.value)} value={selected}>{[...names].map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <label className="text-subhead text-text-secondary">Measure<select aria-label="Measure" className={trackingInputClass} onChange={(event) => setMetric(event.target.value)} value={metric}><option value="duration">Duration</option>{kind === "time" ? <option value="load">Added weight</option> : <option value="distance">Distance</option>}</select></label>
      </div> : null}
      <TrackingChart key={`${kind}:${selected}:${metric}`} emptyMessage={metric === "distance" && names.size ? "No distance is logged for this activity. Choose duration to see its entries." : "Finish a workout with a logged entry to see progress."} points={points} unit={metric === "load" ? "kg" : metric === "distance" ? "km" : "seconds"} />
    </>}
  </section>;
}
