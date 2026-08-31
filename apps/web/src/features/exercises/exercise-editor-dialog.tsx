"use client";

import type { ReactNode } from "react";
import { useModalBehavior } from "../../shared/ui/use-modal-behavior";
import type { CreateExerciseInput, Exercise } from "../../shared/api/types";
import { IconClose } from "../shell/icons";
import { ExerciseForm } from "./exercise-form";

interface ExerciseEditorDialogProps {
  /** `"new"` opens an empty form, an exercise opens it for editing, `null` closes it. */
  exercise: Exercise | "new" | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (input: CreateExerciseInput) => Promise<unknown>;
  onSelectExisting?: (exercise: Exercise) => void | Promise<void>;
  submitLabel?: string;
}

/**
 * The one dialog used to create or edit an exercise.
 *
 * Both entry points — the exercise list and the picker inside a live workout —
 * render this, so the form has the same room, the same scrolling, and the same
 * keyboard behaviour in both. The picker used to squeeze the form into its own
 * footer instead, where the name suggestions and the muscle drop-downs opened
 * over the catalog behind them and fields were unreachable once the on-screen
 * keyboard appeared.
 */
export function ExerciseEditorDialog({
  exercise,
  isSaving,
  onClose,
  onSave,
  onSelectExisting,
  submitLabel
}: ExerciseEditorDialogProps): ReactNode {
  const dialogRef = useModalBehavior<HTMLElement>({ isOpen: exercise !== null, onClose });

  if (!exercise) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-void/70 backdrop-blur-sm lg:items-center">
      <section
        aria-labelledby="exercise-editor-title"
        aria-modal="true"
        className="glass-cyan max-h-[92dvh] w-full overflow-y-auto rounded-t-xl p-4 lg:max-w-2xl lg:rounded-xl"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="mb-3 flex items-center justify-between gap-2">
          <h2 className="min-w-0 break-words font-display text-lg font-bold text-fg" id="exercise-editor-title">
            {exercise === "new" ? "Create exercise" : "Edit exercise"}
          </h2>
          <button
            aria-label="Close exercise editor"
            className="flex size-11 shrink-0 items-center justify-center rounded border border-outline-dim text-fg-muted"
            data-modal-initial-focus
            onClick={onClose}
            type="button"
          >
            <IconClose />
          </button>
        </header>
        <ExerciseForm
          initial={exercise === "new" ? null : exercise}
          isSubmitting={isSaving}
          onCancel={onClose}
          {...(onSelectExisting ? { onSelectExisting } : {})}
          onSubmit={onSave}
          {...(submitLabel ? { submitLabel } : {})}
        />
      </section>
    </div>
  );
}
