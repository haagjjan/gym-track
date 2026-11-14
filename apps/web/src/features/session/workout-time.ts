/** Longest workout the time editor accepts (owner decision, 2026-11-09). */
export const MAX_WORKOUT_MINUTES = 12 * 60;

export interface WorkoutTimeDraft {
  /** Local date of the start, `YYYY-MM-DD`. */
  date: string;
  /** Local times, `HH:MM`. */
  start: string;
  end: string;
}

export type ResolvedWorkoutTime =
  | { ok: true; startedAt: string; endedAt: string; minutes: number; nextDay: boolean }
  | { ok: false; reason: "incomplete" | "same-time" | "too-long" };

const pad = (value: number): string => String(value).padStart(2, "0");

/** Splits stored times into the editor's fields (local time). */
export function toWorkoutTimeDraft(startedAt: string, endedAt: string): WorkoutTimeDraft {
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  return {
    date: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    start: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
    end: `${pad(end.getHours())}:${pad(end.getMinutes())}`
  };
}

/**
 * A workout is one start date plus a start and a finish time. A finish before
 * the start means the workout ran past midnight. The same start and finish is
 * its own error: a short workout can show both in one minute, and reading it as
 * 24 hours would wrongly report "too long".
 */
export function resolveWorkoutTime(draft: WorkoutTimeDraft): ResolvedWorkoutTime {
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(draft.date);
  const start = /^(\d{2}):(\d{2})$/.exec(draft.start);
  const end = /^(\d{2}):(\d{2})$/.exec(draft.end);
  if (!date || !start || !end) return { ok: false, reason: "incomplete" };

  const [year, month, day] = [Number(date[1]), Number(date[2]) - 1, Number(date[3])];
  const startedAt = new Date(year, month, day, Number(start[1]), Number(start[2]));
  const endedAt = new Date(year, month, day, Number(end[1]), Number(end[2]));
  if (endedAt.getTime() === startedAt.getTime()) return { ok: false, reason: "same-time" };
  const nextDay = endedAt.getTime() < startedAt.getTime();
  if (nextDay) endedAt.setDate(endedAt.getDate() + 1);

  const minutes = Math.round((endedAt.getTime() - startedAt.getTime()) / 60_000);
  if (minutes > MAX_WORKOUT_MINUTES) return { ok: false, reason: "too-long" };
  return { ok: true, startedAt: startedAt.toISOString(), endedAt: endedAt.toISOString(), minutes, nextDay };
}
