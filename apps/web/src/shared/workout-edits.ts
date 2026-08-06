import type { WorkoutSet } from "./api/types";

// Skip bookkeeping writes that land in the same moment the session closes.
const RETRO_EDIT_GRACE_MS = 5_000;

/**
 * A set counts as retroactively edited when it was itself modified
 * (updatedAt moved past createdAt) after its session ended — the signal
 * behind the EDITED indicator on historical sets. Both checks matter:
 * updatedAt > endedAt alone would flag every set once the session's times
 * are retroactively moved earlier, and updatedAt > createdAt alone would
 * flag routine mid-session typo fixes.
 */
export function isRetroactivelyEdited(
  set: Pick<WorkoutSet, "createdAt" | "updatedAt">,
  workoutEndedAt: string | null
): boolean {
  if (!workoutEndedAt) {
    return false;
  }

  const updatedAt = new Date(set.updatedAt).getTime();

  return (
    updatedAt > new Date(set.createdAt).getTime() + RETRO_EDIT_GRACE_MS &&
    updatedAt > new Date(workoutEndedAt).getTime() + RETRO_EDIT_GRACE_MS
  );
}
