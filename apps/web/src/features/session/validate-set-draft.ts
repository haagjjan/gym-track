import type { SetInput } from "../../shared/api/types";
import type { SetDraft } from "./set-draft-storage";

export function validateSetDraft(draft: SetDraft): { input: SetInput; error?: never } | { error: string; input?: never } {
  const weightKg = draft.weightKg.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(weightKg) || Number(weightKg) <= 0 || Number(weightKg) >= 10000) {
    return { error: "Weight must be positive, below 10,000 kg, with at most two decimal places." };
  }
  const reps = Number(draft.reps);
  const rir = Number(draft.rir);
  if (!draft.reps.trim() || !Number.isInteger(reps) || reps < 1) return { error: "Reps must be a whole number of at least one." };
  if (!draft.rir.trim() || !Number.isInteger(rir) || rir < 0 || rir > 10) return { error: "RIR must be a whole number from 0 to 10." };
  if (draft.note.length > 1000) return { error: "Notes must be at most 1,000 characters." };
  return { input: { setType: draft.setType, weightKg, reps, rir, note: draft.note.trim() || null, restTimeSeconds: null } };
}
