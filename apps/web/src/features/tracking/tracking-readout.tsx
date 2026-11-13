"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { apiFetch } from "../../shared/api/client";
import { paceLabel, type TrackingPayload } from "./tracking-types";

export function TrackingReadout({ workoutId }: { workoutId: string }): ReactNode {
  const query = useQuery({ queryKey: ["tracking", workoutId], queryFn: () => apiFetch<TrackingPayload>(`/api/tracking/workouts/${workoutId}`) });
  if (query.isLoading) return <p className="mt-3 text-subhead text-text-secondary">Loading time sets and cardio…</p>;
  if (query.isError) return <p className="mt-3 text-subhead text-danger" role="alert">Couldn&apos;t load time sets and cardio.</p>;
  return <ul className="mt-3 space-y-2 break-words text-subhead text-text">
    {query.data?.timedSets.map((entry) => <li key={entry.id}>{entry.exerciseName}: <span className="num">{entry.durationSeconds} s{entry.addedWeightKg !== null ? ` + ${entry.addedWeightKg} kg` : ""}</span>{entry.setType === "warmup" ? " (warmup)" : ""}{entry.note ? ` — ${entry.note}` : ""}</li>)}
    {query.data?.cardioEntries.map((entry) => <li key={entry.id}>{entry.activity}: <span className="num">{entry.durationSeconds} s{entry.distanceMetres ? ` / ${Number(entry.distanceMetres) / 1000} km (${paceLabel(entry.durationSeconds, entry.distanceMetres)})` : ""}</span>{entry.note ? ` — ${entry.note}` : ""}</li>)}
  </ul>;
}
