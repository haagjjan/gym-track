"use client";

import { useState, type ReactNode } from "react";
import { HudButton } from "../../shared/ui/ui";
import { errorMessage } from "../../shared/api/client";
import type { useSessionMutations } from "../../shared/api/hooks";
import type { SetInput, WorkoutSet } from "../../shared/api/types";
import { formatKgValue } from "../../shared/format";
import { isRetroactivelyEdited } from "../../shared/workout-edits";
import { RirChips } from "./set-composer";
import { Stepper } from "./stepper";
import { validateSetDraft } from "./validate-set-draft";
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
      <Badge label={set.setType === "warmup" ? "Warmup" : "Working"} tone={set.setType === "warmup" ? "warmup" : "lavender"} />
      {isRetroactivelyEdited(set, workoutEndedAt) ? <Badge label="Edited" tone="cyan" /> : null}
    </button>
  );
}

export function SessionSetEditor({
  isHistorical,
  mutations,
  onClose,
  onError,
  onSaved,
  set
}: {
  isHistorical: boolean;
  mutations: ReturnType<typeof useSessionMutations>;
  onClose: () => void;
  onError: (message: string | null) => void;
  onSaved?: () => void;
  set: WorkoutSet;
}): ReactNode {
  return <SetEditor isHistorical={isHistorical} onClose={onClose} onError={onError} onSaved={onSaved} set={set}
    isSaving={mutations.updateSet.isPending} isDeleting={mutations.deleteSet.isPending}
    onSave={(input) => mutations.updateSet.mutateAsync({ setId: set.id, input })}
    onDelete={() => mutations.deleteSet.mutateAsync({ setId: set.id })} />;
}

export function SetEditor({ isHistorical, isSaving, isDeleting, onSave, onDelete, onClose, onError, onSaved, set }: {
  isHistorical: boolean; isSaving: boolean; isDeleting: boolean;
  onSave: (input: SetInput) => Promise<unknown>; onDelete: () => Promise<unknown>;
  onClose: () => void; onError: (message: string | null) => void; onSaved?: (() => void) | undefined; set: WorkoutSet;
}): ReactNode {
  const [weightKg, setWeightKg] = useState(formatKgValue(set.weightKg));
  const [reps, setReps] = useState(String(set.reps));
  const [rir, setRir] = useState(String(set.rir));
  const [setType, setSetType] = useState<"working" | "warmup">(set.setType);
  const [note, setNote] = useState(set.note ?? "");
  const confirmDelete = useConfirmTap(remove);
  const confirmSave = useConfirmTap(save);

  function remove(): void {
    void onDelete().then(onClose).catch((caught) => onError(errorMessage(caught, "The set could not be deleted.")));
  }

  function save(): void {
    const result = validateSetDraft({ weightKg, reps, rir, setType, note });
    if (result.error) { onError(result.error); return; }
    if (!result.input) return;
    onError(null);
    void onSave({ ...result.input, restTimeSeconds: set.restTimeSeconds })
      .then(() => { onSaved?.(); onClose(); })
      .catch((caught) => onError(errorMessage(caught, "The set could not be updated.")));
  }

  return (
    <div className={`rounded-lg border p-3 ${isHistorical ? "border-lavender/50" : "border-cyan/40"}`} data-set-inputs>
      <p className={`label-caps mb-2 ${isHistorical ? "text-lavender" : "text-cyan"}`}>
        Edit set {set.setOrder}
      </p>
      {isHistorical ? (
        <p className="mb-2 rounded border border-lavender/40 bg-lavender/5 px-2 py-1.5 text-xs text-lavender">
          Saving permanently changes this completed workout.
        </p>
      ) : null}
      <div className="mb-3 flex gap-1.5" role="radiogroup" aria-label="Set type">
        {(["working", "warmup"] as const).map((type) => (
          <button
            aria-checked={setType === type}
            className={`min-h-11 rounded border px-3 font-display text-[11px] font-bold capitalize ${
              setType === type
                ? type === "working"
                  ? "border-lavender bg-lavender/15 text-lavender"
                  : "border-warmup bg-warmup/10 text-warmup"
                : "border-outline-dim text-outline"
            }`}
            key={type}
            onClick={() => setSetType(type)}
            role="radio"
            type="button"
          >
            {type}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stepper decimals label="WEIGHT" onChange={setWeightKg} step={2.5} unit="KG" value={weightKg} />
        <Stepper label="REPS" min={1} onChange={setReps} step={1} unit="REPS" value={reps} />
        <div className="col-span-2 sm:col-span-1">
          <p className="label-caps mb-1.5 text-outline">RIR</p>
          <RirChips onChange={setRir} value={rir} />
        </div>
      </div>
      <label className="mt-3 block">
        <span className="label-caps text-outline">Note</span>
        <input
          className="mt-1 min-h-11 w-full rounded border border-outline-dim bg-surface-low/60 px-3 text-sm text-fg focus:border-cyan focus:outline-none"
          maxLength={1_000}
          onChange={(event) => setNote(event.currentTarget.value)}
          placeholder="Grip, tempo, pain flag…"
          value={note}
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <HudButton
          className="flex-1"
          disabled={isSaving}
          onClick={isHistorical ? confirmSave.trigger : save}
          size="sm"
          variant={isHistorical && confirmSave.isArmed ? "success" : "primary"}
        >
          {isSaving
            ? "SAVING…"
            : isHistorical && !confirmSave.isArmed
              ? "SAVE HISTORICAL EDIT"
              : isHistorical
                ? "CONFIRM SAVE"
                : "SAVE"}
        </HudButton>
        <HudButton onClick={onClose} size="sm" variant="ghost">Cancel</HudButton>
        <HudButton disabled={isDeleting} onClick={confirmDelete.trigger} size="sm" variant="danger">
          {confirmDelete.isArmed ? "CONFIRM" : "DELETE"}
        </HudButton>
      </div>
    </div>
  );
}

function Badge({ label, tone }: { label: string; tone: "cyan" | "lavender" | "warmup" }): ReactNode {
  return (
    <span className={`shrink-0 rounded-sm border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.06em] ${
      tone === "cyan"
        ? "border-cyan/40 text-cyan"
        : tone === "warmup"
          ? "border-warmup/40 text-warmup"
          : "border-lavender/40 text-lavender"
    }`}>
      {label}
    </span>
  );
}
