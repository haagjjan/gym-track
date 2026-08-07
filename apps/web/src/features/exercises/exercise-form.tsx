"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ConfirmDialog } from "../../shared/ui/confirm-dialog";
import { HudButton } from "../../shared/ui/ui";
import { ApiError } from "../../shared/api/client";
import { useExerciseNameSuggestions, useExerciseOptions, useMuscleGroups } from "../../shared/api/hooks";
import type { CreateExerciseInput, Exercise, ExerciseNameReviewDetails, MuscleGroup } from "../../shared/api/types";

interface ExerciseFormProps {
  initial?: Exercise | null;
  isSubmitting: boolean;
  onCancel: () => void;
  onSelectExisting?: (exercise: Exercise) => void | Promise<void>;
  onSubmit: (input: CreateExerciseInput) => Promise<unknown>;
  submitLabel?: string;
}

export function ExerciseForm({
  initial = null,
  isSubmitting,
  onCancel,
  onSelectExisting,
  onSubmit,
  submitLabel = initial ? "Save exercise" : "Create exercise"
}: ExerciseFormProps): ReactNode {
  const groups = useMuscleGroups();
  const options = useExerciseOptions();
  const [name, setName] = useState(initial?.name ?? "");
  const [debouncedName, setDebouncedName] = useState("");
  const [equipment, setEquipment] = useState(initial?.equipment ?? "");
  const [exerciseType, setExerciseType] = useState(initial?.exerciseType ?? "");
  const [primaryIds, setPrimaryIds] = useState(initial?.primaryMuscleGroups.map((group) => group.id) ?? []);
  const [secondaryIds, setSecondaryIds] = useState(initial?.secondaryMuscleGroups.map((group) => group.id) ?? []);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<{ details: ExerciseNameReviewDetails; blocked: boolean } | null>(null);
  const suggestions = useExerciseNameSuggestions(initial ? "" : debouncedName);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedName(name.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [name]);

  async function submit(confirmNameWarning: boolean): Promise<void> {
    if (!name.trim() || primaryIds.length === 0) {
      setError("Name and at least one primary muscle are required.");
      return;
    }

    setError(null);
    if (confirmNameWarning) setReview(null);
    try {
      await onSubmit({
        name: name.trim(),
        equipment: equipment || null,
        exerciseType: exerciseType || null,
        primaryMuscleGroupIds: primaryIds,
        secondaryMuscleGroupIds: secondaryIds,
        confirmNameWarning
      });
    } catch (caught) {
      if (caught instanceof ApiError && isNameReviewError(caught.code)) {
        const details = reviewDetails(caught.details);
        if (details) {
          setReview({ details, blocked: caught.code === "EXERCISE_NAME_BLOCKED" });
          if (details.normalizedName) setName(details.normalizedName);
          return;
        }
      }
      setError(caught instanceof ApiError ? caught.message : "Exercise could not be saved.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative z-40">
        <label className="block">
          <span className="label-caps text-outline">Name</span>
          <input
            autoComplete="off"
            className="mt-1 min-h-11 w-full rounded border border-outline-dim bg-surface-low px-3 text-base text-fg focus:border-cyan focus:outline-none"
            maxLength={120}
            onChange={(event) => { setName(event.currentTarget.value); setReview(null); }}
            value={name}
          />
        </label>

        {!initial && debouncedName.length >= 2 && (suggestions.data?.length ?? 0) > 0 ? (
          <section aria-label="Existing exercise suggestions" className="absolute left-0 right-0 top-[calc(100%+0.25rem)] max-h-56 overflow-y-auto rounded-lg border border-cyan/30 bg-surface p-2 shadow-xl">
            <p className="label-caps px-1 text-cyan">Did you mean?</p>
            <p className="px-1 text-xs text-fg-muted">Choose an existing match, or keep your custom name and create it below.</p>
            <div className="mt-1 space-y-1">
              {suggestions.data?.slice(0, 5).map((exercise) => (
                <button
                  className="flex min-h-11 w-full items-center justify-between rounded px-2 text-left hover:bg-cyan/10"
                  key={exercise.id}
                  onClick={() => void onSelectExisting?.(exercise)}
                  type="button"
                >
                  <span className="text-sm text-fg">{exercise.name}</span>
                  <span className="text-xs text-outline">{exercise.equipment ?? "Unspecified"}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <ClassificationSelect label="Equipment" onChange={setEquipment} options={options.data?.equipment ?? []} value={equipment} />
        <ClassificationSelect label="Type" onChange={setExerciseType} options={options.data?.exerciseTypes ?? []} value={exerciseType} />
      </div>

      {groups.isError ? <p className="text-xs text-red">Muscle groups could not be loaded.</p> : (
        <div className="space-y-2">
          <MuscleChoices
            groups={groups.data ?? []}
            label="Primary muscles"
            onChange={(id) => { setPrimaryIds(toggle(primaryIds, id)); setSecondaryIds(secondaryIds.filter((item) => item !== id)); }}
            required
            selected={primaryIds}
            tone="cyan"
          />
          <MuscleChoices
            groups={groups.data ?? []}
            label="Secondary muscles"
            onChange={(id) => { setSecondaryIds(toggle(secondaryIds, id)); setPrimaryIds(primaryIds.filter((item) => item !== id)); }}
            selected={secondaryIds}
            tone="lavender"
          />
        </div>
      )}
      {review?.blocked ? <BlockedNameReview review={review} /> : null}
      {error ? <p className="text-xs text-red" role="alert">{error}</p> : null}
      <div className="flex gap-2">
        <HudButton className="flex-1" disabled={isSubmitting || groups.isLoading || options.isLoading} onClick={() => void submit(false)}>{isSubmitting ? "SAVING…" : submitLabel}</HudButton>
        <HudButton onClick={onCancel} variant="ghost">Cancel</HudButton>
      </div>
      <ConfirmDialog
        confirmLabel="SAVE EXERCISE"
        isOpen={Boolean(review && !review.blocked)}
        isPending={isSubmitting}
        message={review?.details.reasons.map((reason) => reason.message).join(" ") ?? "Review this exercise name before saving."}
        onCancel={() => setReview(null)}
        onConfirm={() => void submit(true)}
        pendingLabel="SAVING…"
        title="Save this exercise name?"
        tone="warning"
      />
    </div>
  );
}

function ClassificationSelect({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: string[]; value: string }): ReactNode {
  return <label className="block"><span className="label-caps text-outline">{label}</span><select className="mt-1 min-h-11 w-full rounded border border-outline-dim bg-surface-low px-3 text-sm text-fg focus:border-cyan focus:outline-none" onChange={(event) => onChange(event.currentTarget.value)} value={value}><option value="">Unspecified</option>{options.map((option) => <option key={option} value={option}>{displayLabel(option)}</option>)}</select></label>;
}

function MuscleChoices({ groups, label, onChange, required = false, selected, tone }: { groups: MuscleGroup[]; label: string; onChange: (id: string) => void; required?: boolean; selected: string[]; tone: "cyan" | "lavender" }): ReactNode {
  const [open, setOpen] = useState(false);
  const pickerId = `muscle-picker-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="relative rounded border border-outline-dim/60">
      <button aria-controls={pickerId} aria-expanded={open} className={`flex min-h-11 w-full items-center justify-between px-3 text-xs font-semibold ${tone === "cyan" ? "text-cyan" : "text-lavender"}`} onClick={() => setOpen((value) => !value)} type="button">
        <span>{label}{required ? " *" : ""}</span><span>{selected.length} selected · ⌄</span>
      </button>
      {open ? <div className="absolute bottom-[calc(100%+0.25rem)] left-0 right-0 z-50 grid max-h-52 grid-cols-2 gap-1 overflow-y-auto rounded border border-outline-dim bg-surface p-2 shadow-xl" id={pickerId} role="group">
        {groups.map((group) => <label className="flex min-h-11 items-center gap-2 text-xs text-fg-muted" key={group.id}><input checked={selected.includes(group.id)} className="size-4 accent-cyan" onChange={() => onChange(group.id)} type="checkbox" />{group.name}</label>)}
      </div> : null}
    </div>
  );
}

function BlockedNameReview({ review }: { review: { details: ExerciseNameReviewDetails; blocked: boolean } }): ReactNode { return <div className="rounded border border-red/40 bg-red/5 p-3" role="alert"><p className="label-caps text-red">Name blocked</p>{review.details.reasons.map((reason) => <p className="text-xs text-fg-muted" key={reason.code}>{reason.message}</p>)}</div>; }
function toggle(ids: string[], id: string): string[] { return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]; }
function displayLabel(value: string): string { return value.charAt(0).toUpperCase() + value.slice(1); }
function isNameReviewError(code: string | undefined): boolean { return code === "EXERCISE_NAME_REVIEW_REQUIRED" || code === "EXERCISE_NAME_BLOCKED"; }
function reviewDetails(value: unknown): ExerciseNameReviewDetails | null { if (!value || typeof value !== "object") return null; const candidate = value as Partial<ExerciseNameReviewDetails>; if (!Array.isArray(candidate.reasons) || !Array.isArray(candidate.suggestions)) return null; return { normalizedName: typeof candidate.normalizedName === "string" ? candidate.normalizedName : "", reasons: candidate.reasons, suggestions: candidate.suggestions }; }
