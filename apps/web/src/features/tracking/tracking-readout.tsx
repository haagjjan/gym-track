"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { apiFetch } from "../../shared/api/client";
import { cardioDetail, cardioLabel, timedLabel, type TrackingPayload } from "./tracking-types";

/** Time and cardio exercises of one workout, each with its entries, in the History quick view. */
export function TrackingReadout({ workoutId }: { workoutId: string }): ReactNode {
  const query = useQuery({ queryKey: ["tracking", workoutId], queryFn: () => apiFetch<TrackingPayload>(`/api/tracking/workouts/${workoutId}`) });
  if (query.isLoading) return <p className="mt-3 text-subhead text-text-secondary">Loading time sets and cardio…</p>;
  if (query.isError) return <p className="mt-3 text-subhead text-danger" role="alert">Couldn&apos;t load time sets and cardio.</p>;
  const groups = new Map<string, { id: string; text: string; muted: boolean }[]>();
  const add = (name: string, chip: { id: string; text: string; muted: boolean }): void => { groups.set(name, [...(groups.get(name) ?? []), chip]); };
  query.data?.timedSets.forEach((entry) => add(entry.exerciseName, { id: entry.id, text: timedLabel(entry), muted: entry.setType === "warmup" }));
  query.data?.cardioEntries.forEach((entry) => add(entry.activity, { id: entry.id, text: [cardioLabel(entry), cardioDetail(entry)].filter(Boolean).join(" · "), muted: false }));
  if (groups.size === 0) return null;
  return (
    <ul className="mt-3 space-y-3">
      {[...groups].map(([name, chips]) => (
        <li key={name}>
          <p className="text-callout font-semibold text-text">{name}</p>
          <ul aria-label={`Entries for ${name}`} className="mt-1 flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <li className={`num rounded-full px-2.5 py-1 text-footnote ${chip.muted ? "bg-warning/12 text-text-secondary" : "bg-surface-raised text-text"}`} key={chip.id}>{chip.text}</li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
