export interface EntryBase { id: string; workoutId: string; durationSeconds: number; note: string | null; revision: number; sessionDate: string }
export interface TimedEntry extends EntryBase {
  exerciseId: string; exerciseName: string; setType: "warmup" | "working"; addedWeightKg: string | null;
}
export interface CardioEntry extends EntryBase {
  /** Null only for entries logged before cardio became an exercise. */
  exerciseId: string | null; activity: string; distanceMetres: string | null; averageHeartRate: number | null; calories: number | null;
}
export interface TrackingPayload { timedSets: TimedEntry[]; cardioEntries: CardioEntry[] }
export interface TimedValues { exerciseId: string; durationSeconds: number; setType: "warmup" | "working"; addedWeightKg: string | null; note: string | null }
export interface CardioValues { exerciseId: string; durationSeconds: number; distanceMetres: string | null; averageHeartRate: number | null; calories: number | null; note: string | null }

export function paceLabel(durationSeconds: number, metres: string | null): string | null {
  if (!metres || Number(metres) <= 0) return null;
  const seconds = Math.round(durationSeconds * 1000 / Number(metres));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")} /km`;
}

/** 90 → "1:30", 1500 → "25:00", 3725 → "1:02:05". Durations are never shown as raw seconds. */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}` : `${minutes}:${rest}`;
}

export function formatKm(metres: string): string {
  return `${Number((Number(metres) / 1000).toFixed(2))} km`;
}

export function timedLabel(entry: Pick<TimedEntry, "durationSeconds" | "addedWeightKg">): string {
  const weight = entry.addedWeightKg !== null && Number(entry.addedWeightKg) > 0 ? ` + ${Number(entry.addedWeightKg)} kg` : "";
  return `${formatDuration(entry.durationSeconds)}${weight}`;
}

export function cardioLabel(entry: Pick<CardioEntry, "durationSeconds" | "distanceMetres">): string {
  return entry.distanceMetres ? `${formatDuration(entry.durationSeconds)} · ${formatKm(entry.distanceMetres)}` : formatDuration(entry.durationSeconds);
}

export function cardioDetail(entry: Pick<CardioEntry, "durationSeconds" | "distanceMetres" | "calories" | "averageHeartRate">): string {
  return [paceLabel(entry.durationSeconds, entry.distanceMetres), entry.calories ? `${entry.calories} kcal` : null,
    entry.averageHeartRate ? `${entry.averageHeartRate} bpm` : null].filter(Boolean).join(" · ");
}

/** Logged entries per exercise in one workout, for the exercise list. */
export function entryCounts(payload: TrackingPayload | undefined): Map<string, number> {
  const counts = new Map<string, number>();
  for (const entry of [...(payload?.timedSets ?? []), ...(payload?.cardioEntries ?? [])]) {
    if (entry.exerciseId) counts.set(entry.exerciseId, (counts.get(entry.exerciseId) ?? 0) + 1);
  }
  return counts;
}
