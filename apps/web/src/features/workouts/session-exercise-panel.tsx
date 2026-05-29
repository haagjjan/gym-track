"use client";

import type { ReactNode } from "react";
import { useTransition } from "react";
import type { SessionExercise, WorkoutSet } from "./workout-types";
import { AddSetForm, EditableSetRow } from "./set-editor";

interface SessionExercisePanelProps {
  canMoveDown: boolean;
  canMoveUp: boolean;
  isActive: boolean;
  item: SessionExercise;
  workoutId: string;
  onDeleteExercise: (sessionExerciseId: string) => Promise<void>;
  onMoveExercise: (sessionExerciseId: string, direction: "down" | "up") => Promise<void>;
  onRefresh: () => Promise<unknown>;
  onSelectExercise: (sessionExerciseId: string) => void;
  onShowError: (message: string) => void;
}

export function SessionExercisePanel({
  canMoveDown,
  canMoveUp,
  isActive,
  item,
  workoutId,
  onDeleteExercise,
  onMoveExercise,
  onRefresh,
  onSelectExercise,
  onShowError
}: SessionExercisePanelProps): ReactNode {
  const [isPending, startTransition] = useTransition();
  const summary = summarizeExercise(item);

  function run(action: () => Promise<void>): void {
    startTransition(async () => {
      await action();
    });
  }

  return (
    <article
      className={isActive ? "sessionExercise sessionExerciseActive" : "sessionExercise"}
      aria-label={`${item.exercise.name} exercise`}
    >
      <header className="sessionExerciseHeader">
        <div className="sessionExerciseTitle">
          <span className="positionBadge">{item.position}</span>
          <div>
            <h2>{item.exercise.name}</h2>
            <p>{item.exercise.primaryMuscleGroup.name}</p>
          </div>
        </div>
        <div className="iconButtonRow">
          {!isActive ? (
            <button
              className="primaryAction compactAction"
              type="button"
              onClick={() => onSelectExercise(item.id)}
              disabled={isPending}
            >
              Open/Edit
            </button>
          ) : null}
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

      {!isActive ? <ExerciseSummary summary={summary} /> : null}

      {isActive ? (
        <>
          <div className="activeExerciseMeta">
            <span>Active exercise</span>
            <strong>{summary.setCountLabel}</strong>
          </div>

          <div className="setList">
            {item.sets.map((set) => (
              <EditableSetRow
                key={set.id}
                set={set}
                onRefresh={onRefresh}
                onShowError={onShowError}
              />
            ))}
            {item.sets.length === 0 ? (
              <p className="mutedText">No sets logged yet. Save the first set below.</p>
            ) : null}
          </div>

          <AddSetForm
            sessionExerciseId={item.id}
            workoutId={workoutId}
            onRefresh={onRefresh}
            onShowError={onShowError}
          />
        </>
      ) : null}
    </article>
  );
}

interface ExerciseSummaryValue {
  lastSetLabel: string;
  setCountLabel: string;
}

function ExerciseSummary({ summary }: { summary: ExerciseSummaryValue }): ReactNode {
  return (
    <dl className="exerciseSummary">
      <div>
        <dt>Sets</dt>
        <dd>{summary.setCountLabel}</dd>
      </div>
      <div>
        <dt>Last set</dt>
        <dd>{summary.lastSetLabel}</dd>
      </div>
    </dl>
  );
}

function summarizeExercise(item: SessionExercise): ExerciseSummaryValue {
  const lastSet = item.sets.at(-1);
  const setCountLabel = formatSetCount(item.sets.length);

  return {
    setCountLabel,
    lastSetLabel: lastSet ? formatSetSummary(lastSet) : "No sets yet"
  };
}

function formatSetCount(count: number): string {
  return count === 1 ? "1 set logged" : `${count} sets logged`;
}

function formatSetSummary(set: WorkoutSet): string {
  const rest = set.restTimeSeconds === null ? "" : `, ${set.restTimeSeconds}s rest`;
  const note = set.note ? `, ${set.note}` : "";

  return `${set.weightKg} kg x ${set.reps}, RIR ${set.rir} (${set.setType}${rest}${note})`;
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
