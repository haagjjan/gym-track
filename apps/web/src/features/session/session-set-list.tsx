"use client";

import { useState, type ReactNode } from "react";
import { Button } from "../../shared/ui/button";
import { errorMessage } from "../../shared/api/client";
import type { useSessionMutations } from "../../shared/api/hooks";
import type { SetInput, WorkoutSet } from "../../shared/api/types";
import { formatKgValue } from "../../shared/format";
import { isRetroactivelyEdited } from "../../shared/workout-edits";
import { IconForward } from "../../shared/ui/icons";
import { RirChips, RirLabel, SET_TYPE_LABEL, SetTypeControl } from "./set-composer";
import { Stepper } from "../../shared/ui/stepper";
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
  const warmup = set.setType === "warmup";
  const edited = isRetroactivelyEdited(set, workoutEndedAt);

  return (
    <li>
      <button
        aria-label={`Set ${set.setOrder}${warmup ? ", warm-up" : ""}: ${formatKgValue(set.weightKg)} kg × ${set.reps}, RIR ${set.rir}${edited ? ", edited" : ""}. Edit`}
        className="flex min-h-[3.25rem] w-full items-center gap-3 px-4 text-left active:bg-surface-raised"
        onClick={onEdit}
        type="button"
      >
        <span aria-hidden className={`num flex size-7 flex-none items-center justify-center rounded-full text-footnote font-semibold ${warmup ? "bg-surface-raised text-text-secondary" : "bg-surface-raised text-text"}`}>
          {warmup ? "W" : set.setOrder}
        </span>
        <span aria-hidden className="min-w-0 flex-1">
          <span className="num block text-body text-text">{formatKgValue(set.weightKg)} kg × {set.reps}</span>
          {warmup || edited ? (
            <span className="block text-footnote text-text-muted">{[warmup ? SET_TYPE_LABEL.warmup : null, edited ? "Edited" : null].filter(Boolean).join(", ")}</span>
          ) : null}
        </span>
        <span aria-hidden className="num flex-none text-subhead text-text-secondary">RIR {set.rir}</span>
        <IconForward aria-hidden className="flex-none text-text-muted" />
      </button>
    </li>
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
    void onDelete().then(onClose).catch((caught) => onError(errorMessage(caught, "Couldn't delete this set. Check your connection and try again.")));
  }

  function save(): void {
    const result = validateSetDraft({ weightKg, reps, rir, setType, note });
    if (result.error) { onError(result.error); return; }
    if (!result.input) return;
    onError(null);
    void onSave({ ...result.input, restTimeSeconds: set.restTimeSeconds })
      .then(() => { onSaved?.(); onClose(); })
      .catch((caught) => onError(errorMessage(caught, "Couldn't save this set. Check your connection and try again.")));
  }

  return (
    <div data-set-inputs>
      <h2 className="text-title-3 text-text">Edit set {set.setOrder}</h2>
      {isHistorical ? (
        <p className="mt-1 text-subhead text-text-secondary">This workout is finished. Saving changes its history and stats.</p>
      ) : null}
      <div className="mt-3">
        <SetTypeControl onChange={setSetType} value={setType} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stepper decimals label="Weight" onChange={setWeightKg} step={2.5} unit="kg" value={weightKg} />
        <Stepper label="Reps" min={1} onChange={setReps} step={1} unit="reps" value={reps} />
      </div>
      <div className="mt-4">
        <RirLabel />
        <RirChips onChange={setRir} value={rir} />
      </div>
      <label className="mt-4 block">
        <span className="text-subhead text-text-secondary">Note</span>
        <input
          className="mt-1.5 min-h-[3.125rem] w-full rounded-[var(--radius-control)] border border-control-line bg-surface px-3 text-body text-text placeholder:text-text-muted"
          maxLength={1_000}
          onChange={(event) => setNote(event.currentTarget.value)}
          placeholder="Grip, tempo, how it felt"
          value={note}
        />
      </label>
      <div className="mt-4 grid grid-cols-[1fr_auto] gap-2" data-sheet-actions>
        <Button disabled={isSaving} onClick={isHistorical ? confirmSave.trigger : save}>
          {isSaving
            ? "Saving…"
            : isHistorical && confirmSave.isArmed
              ? "Tap again to save"
              : "Save"}
        </Button>
        <Button onClick={onClose} variant="secondary">Cancel</Button>
      </div>
      <Button className="mt-2 w-full" disabled={isDeleting} onClick={confirmDelete.trigger} variant="destructive">
        {confirmDelete.isArmed ? "Tap again to delete" : "Delete set"}
      </Button>
    </div>
  );
}
