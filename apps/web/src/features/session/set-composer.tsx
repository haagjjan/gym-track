"use client";

import { useState, type ReactNode } from "react";
import { radioGroupKeyDown } from "../../shared/ui/radio-group";
import { Button } from "../../shared/ui/button";
import { InfoPopover } from "../../shared/ui/info-popover";
import { Stepper } from "../../shared/ui/stepper";
import type { SetDraft } from "./set-draft-storage";

interface SetComposerProps {
  draft: SetDraft;
  guidance?: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (patch: Partial<SetDraft>) => void;
  onSave: () => void;
  savedFlash: string | null;
}

export const SET_TYPE_LABEL = { working: "Working", warmup: "Warm-up" } as const;

export function SetComposer(props: SetComposerProps): ReactNode {
  const [showNote, setShowNote] = useState(props.draft.note.length > 0);

  return (
    <section aria-label="New set" data-set-inputs>
      <h2 className="mb-3 text-title-3 text-text">New set</h2>
      <SetTypeControl onChange={(setType) => props.onChange({ setType })} value={props.draft.setType} />

      {props.guidance ? <p className="mt-3 text-subhead text-text-secondary">Weight is the load in kilograms. Reps is how many times you lifted it. These are example values, not a training recommendation.</p> : null}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stepper decimals label="Weight" onChange={(weightKg) => props.onChange({ weightKg })} step={2.5} unit="kg" value={props.draft.weightKg} />
        <Stepper label="Reps" min={1} onChange={(reps) => props.onChange({ reps })} step={1} unit="reps" value={props.draft.reps} />
      </div>

      <div className="mt-4">
        <RirLabel />
        {props.guidance ? <p className="mb-2 text-subhead text-text-secondary">Choose 2 if you think you could have done two more clean reps.</p> : null}
        <RirChips onChange={(rir) => props.onChange({ rir })} value={props.draft.rir} />
      </div>

      {showNote ? (
        <label className="mt-4 block">
          <span className="text-subhead text-text-secondary">Note</span>
          <input
            className="mt-1.5 min-h-[3.125rem] w-full rounded-[var(--radius-control)] border border-control-line bg-surface px-3 text-body text-text placeholder:text-text-muted"
            maxLength={1_000}
            onChange={(event) => props.onChange({ note: event.currentTarget.value })}
            placeholder="Grip, tempo, how it felt"
            value={props.draft.note}
          />
        </label>
      ) : (
        <Button className="mt-2 -ml-4" onClick={() => setShowNote(true)} size="compact" variant="plain">Add note</Button>
      )}

      <div className="mt-4 grid grid-cols-[1fr_auto] gap-2" data-sheet-actions>
        <Button className={props.savedFlash ? "!bg-success" : ""} disabled={props.isSaving} onClick={props.onSave}>
          {props.savedFlash ?? (props.isSaving ? "Saving…" : "Save set")}
        </Button>
        <Button disabled={props.isSaving} onClick={props.onCancel} variant="secondary">Cancel</Button>
      </div>
    </section>
  );
}

/** Segmented control for working and warm-up sets. */
export function SetTypeControl({ onChange, value }: { onChange: (next: "working" | "warmup") => void; value: "working" | "warmup" }): ReactNode {
  return (
    <div aria-label="Set type" className="grid grid-cols-2 gap-1 rounded-full bg-surface p-1" onKeyDown={radioGroupKeyDown} role="radiogroup">
      {(["working", "warmup"] as const).map((type) => (
        <button
          aria-checked={value === type}
          className={`min-h-11 rounded-full text-subhead transition-colors duration-200 ${value === type ? "bg-surface-raised font-semibold text-text shadow-sm" : "text-text-secondary"}`}
          key={type}
          onClick={() => onChange(type)}
          role="radio"
          tabIndex={(value === type) ? 0 : -1}
          type="button"
        >
          {SET_TYPE_LABEL[type]}
        </button>
      ))}
    </div>
  );
}

export function RirLabel(): ReactNode {
  return (
    <p className="mb-1.5 flex items-center text-subhead text-text-secondary">
      Reps in reserve (RIR)
      <InfoPopover label="reps in reserve">How many more clean reps you think you could have done. 0 means none were left; 2 means about two more.</InfoPopover>
    </p>
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
    <div className="grid h-12 grid-cols-6 gap-1.5" onKeyDown={radioGroupKeyDown} role="radiogroup" aria-label="Reps in reserve">
      {["0", "1", "2", "3", "4", "5"].map((option) => (
        <button
          aria-checked={value === option}
          className={`num rounded-full text-headline transition-colors duration-200 ${
            value === option ? "bg-accent text-on-accent" : "bg-surface text-text"
          }`}
          key={option}
          onClick={() => onChange(option)}
          role="radio"
          tabIndex={(value === option) ? 0 : -1}
          type="button"
        >
          {option}
        </button>
      ))}
    </div>
  );
}
