"use client";

import { useState, type ReactNode } from "react";
import { HudButton } from "../../shared/ui/ui";
import { errorMessage } from "../../shared/api/client";
import { useSessionMutations } from "../../shared/api/hooks";
import type { WorkoutSet } from "../../shared/api/types";
import { formatKgValue } from "../../shared/format";
import { isRetroactivelyEdited } from "../../shared/workout-edits";
import { RirChips } from "./set-composer";
import { Stepper } from "./stepper";
import { useConfirmTap } from "./use-confirm-tap";

export function SessionSetRow({
  onEdit,
  set,
  workoutEndedAt
}: {
  onEdit: () => void;
  set: WorkoutSet;
  workoutEndedAt: string | null;
}): ReactNode {
  return (
    <button
      className="flex min-h-12 w-full items-center gap-2 rounded-lg border border-outline-dim/50 bg-surface-low/30 px-3 text-left transition-colors hover:border-cyan/50"
      onClick={onEdit}
      type="button"
    >
      <span className="w-6 shrink-0 text-center font-mono text-xs text-outline">{set.setOrder}</span>
      <span className="min-w-0 flex-1 font-mono text-sm text-fg">
        {formatKgValue(set.weightKg)} kg × {set.reps}
      </span>
      <span className="font-mono text-xs text-fg-muted">RIR {set.rir}</span>
      <Badge label={set.setType === "warmup" ? "Warmup" : "Working"} tone={set.setType === "warmup" ? "lavender" : "cyan"} />
      {isRetroactivelyEdited(set, workoutEndedAt) ? <Badge label="Edited" tone="cyan" /> : null}
    </button>
  );
}

export function SessionSetEditor({
  isHistorical,
  mutations,
  onClose,
  onError,
  set
}: {
  isHistorical: boolean;
  mutations: ReturnType<typeof useSessionMutations>;
  onClose: () => void;
  onError: (message: string | null) => void;
  set: WorkoutSet;
}): ReactNode {
  const [weightKg, setWeightKg] = useState(formatKgValue(set.weightKg));
  const [reps, setReps] = useState(String(set.reps));
  const [rir, setRir] = useState(String(set.rir));
  const confirmDelete = useConfirmTap(remove);
  const confirmSave = useConfirmTap(save);

  function remove(): void {
    mutations.deleteSet.mutate(
      { setId: set.id },
      {
        onSuccess: onClose,
        onError: (caught) => onError(errorMessage(caught, "The set could not be deleted."))
      }
    );
  }

  function save(): void {
    const repsValue = Number(reps);
    const rirValue = Number(rir);

    if (!Number.isFinite(Number(weightKg)) || !Number.isInteger(repsValue) || repsValue < 1) {
      onError("Weight and reps need valid values.");
      return;
    }

    onError(null);
    mutations.updateSet.mutate(
      {
        setId: set.id,
        input: {
          weightKg,
          reps: repsValue,
          rir: Number.isFinite(rirValue) ? rirValue : set.rir
        }
      },
      {
        onSuccess: onClose,
        onError: (caught) => onError(errorMessage(caught, "The set could not be updated."))
      }
    );
  }

  return (
    <div className={`rounded-lg border p-3 ${isHistorical ? "border-lavender/50" : "border-cyan/40"}`}>
      <p className={`label-caps mb-2 ${isHistorical ? "text-lavender" : "text-cyan"}`}>
        Edit set {set.setOrder}
      </p>
      {isHistorical ? (
        <p className="mb-2 rounded border border-lavender/40 bg-lavender/5 px-2 py-1.5 text-xs text-lavender">
          Saving permanently changes this completed workout.
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stepper decimals label="WEIGHT" onChange={setWeightKg} step={2.5} unit="KG" value={weightKg} />
        <Stepper label="REPS" min={1} onChange={setReps} step={1} unit="REPS" value={reps} />
        <div className="col-span-2 sm:col-span-1">
          <p className="label-caps mb-1.5 text-outline">RIR</p>
          <RirChips onChange={setRir} value={rir} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <HudButton
          className="flex-1"
          disabled={mutations.updateSet.isPending}
          onClick={isHistorical ? confirmSave.trigger : save}
          size="sm"
          variant={isHistorical && confirmSave.isArmed ? "success" : "primary"}
        >
          {mutations.updateSet.isPending
            ? "SAVING…"
            : isHistorical && !confirmSave.isArmed
              ? "SAVE HISTORICAL EDIT"
              : isHistorical
                ? "CONFIRM SAVE"
                : "SAVE"}
        </HudButton>
        <HudButton onClick={onClose} size="sm" variant="ghost">Cancel</HudButton>
        <HudButton disabled={mutations.deleteSet.isPending} onClick={confirmDelete.trigger} size="sm" variant="danger">
          {confirmDelete.isArmed ? "CONFIRM" : "DELETE"}
        </HudButton>
      </div>
    </div>
  );
}

function Badge({ label, tone }: { label: string; tone: "cyan" | "lavender" }): ReactNode {
  return (
    <span className={`shrink-0 rounded-sm border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.06em] ${
      tone === "cyan" ? "border-cyan/40 text-cyan" : "border-lavender/40 text-lavender"
    }`}>
      {label}
    </span>
  );
}
