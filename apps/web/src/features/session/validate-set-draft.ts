import type { SetInput } from "../../shared/api/types";
import type { SetDraft } from "./set-draft-storage";

export function validateSetDraft(draft: SetDraft): { input: SetInput; error?: never } | { error: string; input?: never } {
  const weightKg = draft.weightKg.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(weightKg) || Number(weightKg) <= 0 || Number(weightKg) >= 10000) {
    return { error: "Enter a weight between 0.01 and 9,999 kg, with up to two decimals." };
  }
  const reps = Number(draft.reps);
  const rir = Number(draft.rir);
  if (!draft.reps.trim() || !Number.isInteger(reps) || reps < 1) return { error: "Enter at least 1 rep." };
  if (!draft.rir.trim() || !Number.isInteger(rir) || rir < 0 || rir > 10) return { error: "Enter an RIR from 0 to 10." };
  if (draft.note.length > 1000) return { error: "Notes can be up to 1,000 characters." };
  return { input: { setType: draft.setType, weightKg, reps, rir, note: draft.note.trim() || null, restTimeSeconds: null } };
}
