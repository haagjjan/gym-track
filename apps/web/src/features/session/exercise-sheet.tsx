"use client";

import { useEffect, useState, type ReactNode } from "react";
import { HudButton } from "../../shared/ui/ui";
import type { CreateExerciseInput, Exercise } from "../../shared/api/types";
import { ExerciseForm } from "../exercises/exercise-form";
import { ExercisePicker } from "../exercises/exercise-picker";
import { IconPlus } from "../shell/icons";

interface ExerciseSheetProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onAddSelected: (exerciseIds: string[]) => Promise<boolean>;
  onCreate: (input: CreateExerciseInput) => Promise<Exercise>;
  onClose: () => void;
}

export function ExerciseSheet(props: ExerciseSheetProps): ReactNode {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!props.isOpen) {
      setSelectedIds([]);
      setShowCreate(false);
    }
  }, [props.isOpen]);

  return <ExercisePicker
    footer={showCreate ? <ExerciseForm isSubmitting={props.isSubmitting} onCancel={() => setShowCreate(false)} onSelectExisting={async (exercise) => { if (await props.onAddSelected([exercise.id])) props.onClose(); }} onSubmit={props.onCreate} submitLabel="CREATE AND ADD" /> : <div className="space-y-2"><HudButton className="w-full" disabled={selectedIds.length === 0 || props.isSubmitting} onClick={async () => { if (await props.onAddSelected(selectedIds)) props.onClose(); }}>Add selected exercises ({selectedIds.length})</HudButton><HudButton className="w-full" onClick={() => setShowCreate(true)} variant="outline"><IconPlus /> Create new exercise</HudButton></div>}
    isOpen={props.isOpen}
    isSubmitting={props.isSubmitting}
    onClose={props.onClose}
    onSelect={(exercise) => setSelectedIds((current) => current.includes(exercise.id) ? current.filter((id) => id !== exercise.id) : [...current, exercise.id])}
    selectedIds={selectedIds}
    selectionMode="multiple"
    title="Choose exercises"
  />;
}
