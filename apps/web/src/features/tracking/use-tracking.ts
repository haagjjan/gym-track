"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { apiFetch, ApiError } from "../../shared/api/client";
import type { CardioEntry, CardioValues, TimedEntry, TimedValues, TrackingPayload } from "./tracking-types";

export function useTracking(workoutId: string) {
  const client = useQueryClient();
  const prefix = `/api/tracking/workouts/${encodeURIComponent(workoutId)}`;
  const pendingCreate = useRef<string | null>(null);
  const entries = useQuery({ queryKey: ["tracking", workoutId], queryFn: () => apiFetch<TrackingPayload>(prefix) });
  const refresh = async (): Promise<void> => {
    await Promise.all([client.invalidateQueries({ queryKey: ["tracking"] }), client.invalidateQueries({ queryKey: ["workout"] }), client.invalidateQueries({ queryKey: ["workouts"] }), client.invalidateQueries({ queryKey: ["workouts-infinite"] }),
      client.invalidateQueries({ queryKey: ["weekly-volume"] }), client.invalidateQueries({ queryKey: ["tracking-progress"] })]);
  };
  const save = useMutation({
    mutationFn: async ({ kind, values, entry }: { kind: "timed-sets" | "cardio"; values: TimedValues | CardioValues; entry?: TimedEntry | CardioEntry | undefined }) => {
      if (entry) return apiFetch(`${prefix}/${kind}/${entry.id}`, { method: "PATCH", body: { ...values, revision: entry.revision } });
      // Keep the logical action's ID even if the draft changes after a lost
      // acknowledgement. A conflict is safer than creating a duplicate entry.
      pendingCreate.current ??= crypto.randomUUID();
      return apiFetch(`${prefix}/${kind}`, { method: "POST", body: { ...values, id: pendingCreate.current } });
    },
    onSuccess: async () => { pendingCreate.current = null; await refresh(); },
    onError: async (error) => { if (error instanceof ApiError && error.status === 409) await refresh(); }
  });
  const remove = useMutation({ mutationFn: ({ kind, entry }: { kind: "timed-sets" | "cardio"; entry: TimedEntry | CardioEntry }) =>
    apiFetch(`${prefix}/${kind}/${entry.id}?revision=${entry.revision}`, { method: "DELETE" }), onSuccess: refresh,
    onError: async (error) => { if (error instanceof ApiError && error.status === 409) await refresh(); } });
  return { entries, save, remove, abandonCreate: () => { pendingCreate.current = null; } };
}
