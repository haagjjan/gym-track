"use client";

import { useExtendedTracking } from "../../shared/extended-tracking";
import { radioGroupKeyDown } from "../../shared/ui/radio-group";
import type { TrackingMode } from "../../shared/api/types";
import { useEffect, useState, type ReactNode } from "react";
import { ConfirmDialog } from "../../shared/ui/confirm-dialog";
import { Button } from "../../shared/ui/button";
import { fieldClass, labelClass } from "./field-classes";
import { IconChevronDown } from "../../shared/ui/icons";
import { ApiError } from "../../shared/api/client";
import { useExerciseNameSuggestions, useExerciseOptions, useMuscleGroups } from "../../shared/api/hooks";
import type { CreateExerciseInput, Exercise, ExerciseNameReviewDetails, MuscleGroup } from "../../shared/api/types";

interface ExerciseFormProps {
  /** Preselects "Logged by" for a new exercise. */
  defaultTrackingMode?: "reps" | TrackingMode;
  initial?: Exercise | null;
  isSubmitting: boolean;
  onCancel: () => void;
  onSelectExisting?: (exercise: Exercise) => void | Promise<void>;
  onSubmit: (input: CreateExerciseInput) => Promise<unknown>;
  submitLabel?: string;
}

const TRACKING_CHOICES: Array<{ value: "reps" | TrackingMode; label: string; hint: string }> = [
  { value: "reps", label: "Weight & reps", hint: "Sets with weight, reps and RIR, such as a bench press." },
  { value: "time", label: "Time", hint: "Holds timed in minutes and seconds, such as a plank or dead hang." },
  { value: "cardio", label: "Cardio", hint: "Duration with optional distance, calories and heart rate, such as a run." }
];

export function ExerciseForm({
  defaultTrackingMode = "reps",
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
  const trackingEnabled = useExtendedTracking();
  const [trackingMode, setTrackingMode] = useState<"reps" | TrackingMode>(defaultTrackingMode);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<{ details: ExerciseNameReviewDetails; blocked: boolean } | null>(null);
  // The "Did you mean?" list floats over the fields below the name. Without a
  // way to put it away, a member who deliberately wants a name close to an
  // existing one cannot reach the rest of the form.
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const suggestions = useExerciseNameSuggestions(initial ? "" : debouncedName);
  const showSuggestions = !initial
    && !suggestionsDismissed
    && debouncedName.length >= 2
    && (suggestions.data?.length ?? 0) > 0;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedName(name.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [name]);

  async function submit(confirmNameWarning: boolean): Promise<void> {
    if (!name.trim() || primaryIds.length === 0) {
      setError("Add a name and choose at least one primary muscle.");
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
        confirmNameWarning,
        ...(!initial && trackingMode !== "reps" ? { trackingMode } : {})
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
      setError(caught instanceof ApiError ? caught.message : "Couldn't save the exercise. Check your connection and try again.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative z-40">
        <label className="block">
          <span className={labelClass}>Name</span>
          <input
            autoComplete="off"
            className={`mt-1.5 ${fieldClass}`}
            maxLength={120}
            onChange={(event) => {
              setName(event.currentTarget.value);
              setReview(null);
              // Clearing the field starts a fresh naming attempt, so offer
              // matches again; otherwise a dismissal sticks while typing.
              if (event.currentTarget.value.trim().length < 2) setSuggestionsDismissed(false);
            }}
            onKeyDown={(event) => {
              // Escape puts the suggestions away without closing the dialog.
              if (event.key === "Escape" && showSuggestions) {
                event.stopPropagation();
                setSuggestionsDismissed(true);
              }
            }}
            value={name}
          />
        </label>

        {showSuggestions ? (
          <section aria-label="Existing exercise suggestions" className="absolute left-0 right-0 top-[calc(100%+0.25rem)] max-h-56 overflow-y-auto rounded-[var(--radius-card)] border border-line bg-surface p-2 shadow-lg">
            <div className="flex items-start justify-between gap-2 px-1">
              <div className="min-w-0">
                <p className="text-headline text-text">Did you mean?</p>
                <p className="text-subhead text-text-secondary">Pick an existing exercise, or keep the name you typed.</p>
              </div>
              <button
                className="min-h-11 shrink-0 rounded-[var(--radius-control)] px-2 text-subhead text-accent"
                onClick={() => setSuggestionsDismissed(true)}
                type="button"
              >
                Keep my name
              </button>
            </div>
            <div className="mt-1 space-y-1">
              {suggestions.data?.slice(0, 5).map((exercise) => (
                <button
                  className="flex min-h-11 w-full items-center justify-between gap-3 rounded-[var(--radius-control)] px-2 text-left active:bg-surface-raised"
                  key={exercise.id}
                  onClick={() => void onSelectExisting?.(exercise)}
                  type="button"
                >
                  <span className="min-w-0 break-words text-body text-text">{exercise.name}</span>
                  <span className="shrink-0 text-footnote text-text-muted">{exercise.equipment ?? "Unspecified"}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {trackingEnabled && !initial ? (
        <div>
          <p className={labelClass} id="tracked-by-label">Logged by</p>
          <div aria-labelledby="tracked-by-label" className="mt-1.5 grid grid-cols-3 gap-1 rounded-full bg-surface p-1" onKeyDown={radioGroupKeyDown} role="radiogroup">
            {TRACKING_CHOICES.map((choice) => (
              <button
                aria-checked={trackingMode === choice.value}
                className={`min-h-11 rounded-full px-1 text-subhead transition-colors duration-200 ${trackingMode === choice.value ? "bg-surface-raised font-semibold text-text shadow-sm" : "text-text-secondary"}`}
                key={choice.value}
                onClick={() => setTrackingMode(choice.value)}
                role="radio"
                tabIndex={trackingMode === choice.value ? 0 : -1}
                type="button"
              >
                {choice.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-footnote text-text-secondary">{TRACKING_CHOICES.find((choice) => choice.value === trackingMode)?.hint}</p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <ClassificationSelect label="Equipment" onChange={setEquipment} options={options.data?.equipment ?? []} value={equipment} />
        <ClassificationSelect label="Type" onChange={setExerciseType} options={options.data?.exerciseTypes ?? []} value={exerciseType} />
      </div>

      {groups.isError ? <p className="text-subhead text-danger">Couldn&apos;t load muscle groups. Close and reopen this screen to try again.</p> : (
        <div className="space-y-2">
          <MuscleChoices
            groups={groups.data ?? []}
            label="Primary muscles"
            onChange={(id) => { setPrimaryIds(toggle(primaryIds, id)); setSecondaryIds(secondaryIds.filter((item) => item !== id)); }}
            required
            selected={primaryIds}
          />
          <MuscleChoices
            groups={groups.data ?? []}
            label="Secondary muscles"
            onChange={(id) => { setSecondaryIds(toggle(secondaryIds, id)); setPrimaryIds(primaryIds.filter((item) => item !== id)); }}
            selected={secondaryIds}
          />
          <p className="text-footnote text-text-secondary">{trackingMode === "cardio" ? "Cardio does not count toward muscle volume." : "In Volume, each working set counts as 1 for primary muscles and 0.5 for secondary muscles."}</p>
        </div>
      )}
      {review?.blocked ? <BlockedNameReview review={review} /> : null}
      {error ? <p className="text-subhead text-danger" role="alert">{error}</p> : null}
      <div className="grid gap-2">
        <Button disabled={isSubmitting || groups.isLoading || options.isLoading} onClick={() => void submit(false)}>{isSubmitting ? "Saving…" : submitLabel}</Button>
        <Button onClick={onCancel} variant="plain">Cancel</Button>
      </div>
      <ConfirmDialog
        confirmLabel="Save exercise"
        isOpen={Boolean(review && !review.blocked)}
        isPending={isSubmitting}
        message={review?.details.reasons.map((reason) => reason.message).join(" ") ?? "Review this exercise name before saving."}
        onCancel={() => setReview(null)}
        onConfirm={() => void submit(true)}
        pendingLabel="Saving…"
        title="Save this exercise name?"
        tone="warning"
      />
    </div>
  );
}

function ClassificationSelect({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: string[]; value: string }): ReactNode {
  return <label className="block"><span className={labelClass}>{label}</span><select className={`mt-1.5 ${fieldClass}`} onChange={(event) => onChange(event.currentTarget.value)} value={value}><option value="">Unspecified</option>{options.map((option) => <option key={option} value={option}>{displayLabel(option)}</option>)}</select></label>;
}

function MuscleChoices({ groups, label, onChange, required = false, selected }: { groups: MuscleGroup[]; label: string; onChange: (id: string) => void; required?: boolean; selected: string[] }): ReactNode {
  const [open, setOpen] = useState(false);
  const pickerId = `muscle-picker-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="relative rounded-[var(--radius-control)] border border-control-line bg-surface">
      <button aria-controls={pickerId} aria-expanded={open} className="flex min-h-[3.125rem] w-full items-center justify-between gap-2 px-3 text-body text-text" onClick={() => setOpen((value) => !value)} type="button">
        <span>{label}{required ? " (required)" : ""}</span>
        <span className="flex items-center gap-1 text-subhead text-text-secondary"><span className="num">{selected.length}</span> selected <IconChevronDown className={open ? "rotate-180" : ""} /></span>
      </button>
      {open ? <div className="absolute bottom-[calc(100%+0.25rem)] left-0 right-0 z-50 grid max-h-52 grid-cols-2 gap-1 overflow-y-auto rounded-[var(--radius-card)] border border-line bg-surface-raised p-2 shadow-lg" id={pickerId} role="group">
        {groups.map((group) => <label className="flex min-h-11 items-center gap-2 text-subhead text-text" key={group.id}><input checked={selected.includes(group.id)} className="size-5 accent-[var(--accent)]" onChange={() => onChange(group.id)} type="checkbox" />{group.name}</label>)}
      </div> : null}
    </div>
  );
}

function BlockedNameReview({ review }: { review: { details: ExerciseNameReviewDetails; blocked: boolean } }): ReactNode { return <div className="rounded-[var(--radius-card)] bg-surface p-3" role="alert"><p className="text-headline text-danger">Name not allowed</p>{review.details.reasons.map((reason) => <p className="text-subhead text-text-secondary" key={reason.code}>{reason.message}</p>)}</div>; }
function toggle(ids: string[], id: string): string[] { return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]; }
function displayLabel(value: string): string { return value.charAt(0).toUpperCase() + value.slice(1); }
function isNameReviewError(code: string | undefined): boolean { return code === "EXERCISE_NAME_REVIEW_REQUIRED" || code === "EXERCISE_NAME_BLOCKED"; }
function reviewDetails(value: unknown): ExerciseNameReviewDetails | null { if (!value || typeof value !== "object") return null; const candidate = value as Partial<ExerciseNameReviewDetails>; if (!Array.isArray(candidate.reasons) || !Array.isArray(candidate.suggestions)) return null; return { normalizedName: typeof candidate.normalizedName === "string" ? candidate.normalizedName : "", reasons: candidate.reasons, suggestions: candidate.suggestions }; }
