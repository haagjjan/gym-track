export interface EntryBase { id: string; workoutId: string; durationSeconds: number; note: string | null; revision: number; sessionDate: string }
export interface TimedEntry extends EntryBase {
  exerciseId: string; exerciseName: string; setType: "warmup" | "working"; addedWeightKg: string | null;
}
export interface CardioEntry extends EntryBase { activity: string; distanceMetres: string | null; averageHeartRate: number | null }
export interface TrackingPayload { timedSets: TimedEntry[]; cardioEntries: CardioEntry[] }
export interface TimedValues { exerciseId: string; durationSeconds: number; setType: "warmup" | "working"; addedWeightKg: string | null; note: string | null }
export interface CardioValues { activity: string; durationSeconds: number; distanceMetres: string | null; averageHeartRate: number | null; note: string | null }
export function paceLabel(durationSeconds: number, metres: string | null): string | null {
  if (!metres || Number(metres) <= 0) return null;
  const seconds = Math.round(durationSeconds * 1000 / Number(metres));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")} /km`;
}
