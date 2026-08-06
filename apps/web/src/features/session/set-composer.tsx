"use client";

import { useState, type ReactNode } from "react";
import { HudButton } from "../../shared/ui/ui";
import { InfoPopover } from "../../shared/ui/info-popover";
import { Stepper } from "./stepper";
import type { SetDraft } from "./set-draft-storage";

interface SetComposerProps {
  draft: SetDraft;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (patch: Partial<SetDraft>) => void;
  onSave: () => void;
  savedFlash: string | null;
}

export function SetComposer(props: SetComposerProps): ReactNode {
  const [showNote, setShowNote] = useState(props.draft.note.length > 0);

  return (
    <section className="mt-2 rounded-xl border border-cyan/40 bg-surface-low/60 p-3" aria-label="New set" data-set-inputs>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5" role="radiogroup" aria-label="Set type">
          {(["working", "warmup"] as const).map((type) => (
            <button
              aria-checked={props.draft.setType === type}
              className={`min-h-10 rounded border px-3 font-display text-[11px] font-bold capitalize ${
                props.draft.setType === type
                  ? type === "working"
                    ? "border-lavender bg-lavender/15 text-lavender"
                    : "border-warmup bg-warmup/10 text-warmup"
                  : "border-outline-dim text-outline"
              }`}
              key={type}
              onClick={() => props.onChange({ setType: type })}
              role="radio"
              type="button"
            >
              {type}
            </button>
          ))}
        </div>
        <button
          className={`min-h-10 rounded border px-3 text-xs font-semibold ${
            showNote ? "border-cyan text-cyan" : "border-outline-dim text-outline"
          }`}
          onClick={() => setShowNote((current) => !current)}
          type="button"
        >
          Note{props.draft.note ? " ·" : " +"}
        </button>
      </div>

      {showNote ? (
        <input
          className="mb-3 min-h-11 w-full rounded border border-outline-dim bg-surface px-3 text-sm text-fg placeholder:text-outline focus:border-cyan focus:outline-none"
          onChange={(event) => props.onChange({ note: event.currentTarget.value })}
          placeholder="Grip, tempo, pain flag…"
          value={props.draft.note}
        />
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <Stepper
          decimals
          label="WEIGHT"
          onChange={(weightKg) => props.onChange({ weightKg })}
          step={2.5}
          unit="KG"
          value={props.draft.weightKg}
        />
        <Stepper
          label="REPS"
          min={1}
          onChange={(reps) => props.onChange({ reps })}
          step={1}
          unit="REPS"
          value={props.draft.reps}
        />
      </div>

      <div className="mt-3">
        <p className="label-caps mb-1.5 text-outline">RIR <InfoPopover label="reps in reserve">How many clean repetitions you estimate remained. 0 means none; 2 means roughly two.</InfoPopover></p>
        <RirChips onChange={(rir) => props.onChange({ rir })} value={props.draft.rir} />
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <HudButton
          className={props.savedFlash ? "!bg-green !text-green-deep" : ""}
          disabled={props.isSaving}
          onClick={props.onSave}
          size="lg"
        >
          {props.savedFlash ?? (props.isSaving ? "SAVING…" : "SAVE SET")}
        </HudButton>
        <HudButton disabled={props.isSaving} onClick={props.onCancel} variant="ghost">
          Cancel
        </HudButton>
      </div>
    </section>
  );
}

export function RirChips({
  onChange,
  value
}: {
  onChange: (next: string) => void;
  value: string;
}): ReactNode {
  return (
    <div className="flex h-12 items-stretch gap-1" role="radiogroup" aria-label="Reps in reserve">
      {["0", "1", "2", "3", "4", "5"].map((option) => (
        <button
          aria-checked={value === option}
          className={`min-w-0 flex-1 rounded border font-mono text-sm ${
            value === option
              ? "border-cyan bg-cyan/15 text-cyan"
              : "border-outline-dim bg-surface-low/40 text-fg-muted"
          }`}
          key={option}
          onClick={() => onChange(option)}
          role="radio"
          type="button"
        >
          {option}
        </button>
      ))}
    </div>
  );
}
