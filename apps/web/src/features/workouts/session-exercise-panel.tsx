"use client";

import type { ReactNode } from "react";
import { useTransition } from "react";
import type { SessionExercise } from "./workout-types";
import { AddSetForm, EditableSetRow } from "./set-editor";

interface SessionExercisePanelProps {
  canMoveDown: boolean;
  canMoveUp: boolean;
  item: SessionExercise;
  workoutId: string;
  onDeleteExercise: (sessionExerciseId: string) => Promise<void>;
  onMoveExercise: (sessionExerciseId: string, direction: "down" | "up") => Promise<void>;
  onRefresh: () => Promise<void>;
  onShowError: (message: string) => void;
}

export function SessionExercisePanel({
  canMoveDown,
  canMoveUp,
  item,
  workoutId,
  onDeleteExercise,
  onMoveExercise,
  onRefresh,
  onShowError
}: SessionExercisePanelProps): ReactNode {
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<void>): void {
    startTransition(async () => {
      await action();
    });
  }

  return (
    <article className="sessionExercise">
      <header className="sessionExerciseHeader">
        <div>
          <span className="positionBadge">{item.position}</span>
          <h2>{item.exercise.name}</h2>
          <p>{item.exercise.primaryMuscleGroup.name}</p>
        </div>
        <div className="iconButtonRow">
          <MoveButton
            disabled={!canMoveUp || isPending}
            label="Up"
            onClick={() => run(() => onMoveExercise(item.id, "up"))}
          />
          <MoveButton
            disabled={!canMoveDown || isPending}
            label="Down"
            onClick={() => run(() => onMoveExercise(item.id, "down"))}
          />
          <button
            className="dangerAction"
            type="button"
            onClick={() => run(() => onDeleteExercise(item.id))}
            disabled={isPending}
          >
            Remove
          </button>
        </div>
      </header>

      <div className="setList">
        {item.sets.map((set) => (
          <EditableSetRow
            key={set.id}
            set={set}
            onRefresh={onRefresh}
            onShowError={onShowError}
          />
        ))}
        {item.sets.length === 0 ? <p className="mutedText">No sets logged.</p> : null}
      </div>

      <AddSetForm
        sessionExerciseId={item.id}
        workoutId={workoutId}
        onRefresh={onRefresh}
        onShowError={onShowError}
      />
    </article>
  );
}

function MoveButton({
  disabled,
  label,
  onClick
}: {
  disabled: boolean;
  label: string;
  onClick: () => void;
}): ReactNode {
  return (
    <button
      className="smallAction"
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={`Move ${label.toLowerCase()}`}
    >
      {label}
    </button>
  );
}
