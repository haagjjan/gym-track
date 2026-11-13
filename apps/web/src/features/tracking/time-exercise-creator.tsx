"use client";

import { useState, type ReactNode } from "react";
import { apiFetch } from "../../shared/api/client";
import type { Exercise } from "../../shared/api/types";
import { ExerciseForm } from "../exercises/exercise-form";

export function TimeExerciseCreator({ onCreated, onCancel, onPendingChange }: { onPendingChange: (pending: boolean) => void; onCreated: (id: string) => Promise<void>; onCancel: () => void }): ReactNode {
  const [pending, setPending] = useState(false);
  return <ExerciseForm isSubmitting={pending} onCancel={onCancel} onSubmit={async (input) => {
    setPending(true); onPendingChange(true);
    try {
      const result = await apiFetch<{ exercise: Exercise }>("/api/exercises", { method: "POST", body: { ...input, trackingMode: "time" } });
      await onCreated(result.exercise.id);
    } finally { setPending(false); onPendingChange(false); }
  }} submitLabel="Create time exercise" />;
}
