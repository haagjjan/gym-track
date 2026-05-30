import type { SetType, SessionExercise, WorkoutSet } from "./workout-types";

export type SetDraftField = "note" | "reps" | "restTimeSeconds" | "rir" | "setType" | "weightKg";

export interface SetDraftValues {
  note: string;
  reps: string;
  restTimeSeconds: string;
  rir: string;
  setType: SetType;
  weightKg: string;
}

export interface SetDraft {
  isStarted: boolean;
  values: SetDraftValues;
}

export function createDraftFromExercise(item: SessionExercise): SetDraft {
  const lastSet = item.sets.at(-1);

  return lastSet ? createDraftFromSet(lastSet) : createDefaultDraft();
}

export function createDraftFromSet(set: WorkoutSet): SetDraft {
  return {
    isStarted: false,
    values: {
      note: "",
      reps: String(set.reps),
      restTimeSeconds: set.restTimeSeconds === null ? "" : String(set.restTimeSeconds),
      rir: String(set.rir),
      setType: set.setType,
      weightKg: set.weightKg
    }
  };
}

export function createDefaultDraft(): SetDraft {
  return {
    isStarted: false,
    values: {
      note: "",
      reps: "",
      restTimeSeconds: "",
      rir: "2",
      setType: "working",
      weightKg: ""
    }
  };
}

export function updateDraftField(
  draft: SetDraft,
  field: SetDraftField,
  value: string
): SetDraft {
  return {
    isStarted: true,
    values: {
      ...draft.values,
      [field]: field === "setType" && value !== "warmup" ? "working" : value
    }
  };
}
