"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { ExercisePicker } from "./exercise-picker";

interface ExerciseInsertDialogProps {
  isOpen: boolean;
  onAddExercise: (exerciseId: string) => Promise<boolean>;
  onClose: () => void;
}

export function ExerciseInsertDialog({
  isOpen,
  onAddExercise,
  onClose
}: ExerciseInsertDialogProps): ReactNode {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onClose();
      }
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="exerciseInsertOverlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        aria-labelledby="exercise-insert-title"
        aria-modal="true"
        className="exerciseInsertDialog"
        role="dialog"
      >
        <header className="exerciseInsertHeader">
          <div>
            <p>INSERT_FLOW</p>
            <h2 id="exercise-insert-title">Add exercise to session</h2>
            <span>Choose the next station without leaving the live workout console.</span>
          </div>
          <button className="smallAction exerciseInsertClose" type="button" onClick={onClose}>
            CLOSE
          </button>
        </header>
        <ExercisePicker autoFocus onAddExercise={onAddExercise} onInserted={onClose} />
      </section>
    </div>
  );
}
