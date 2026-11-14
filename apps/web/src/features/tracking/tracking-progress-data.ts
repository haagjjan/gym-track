import type { ProgressExerciseChoice } from "../progress/progress-panels";
import { localDayKey, windowStart, type ChartWindow } from "../progress/progress-selection";
import { cardioDetail, cardioLabel, formatDuration, timedLabel, type CardioEntry, type TimedEntry, type TrackingPayload } from "./tracking-types";

export type TrackingMetric = "duration" | "load" | "distance";
export interface TrackingExerciseChoice extends ProgressExerciseChoice { kind: "time" | "cardio" }
export interface TrackingDay { date: string; time: number; value: number; detail: string; id: string; changed: boolean }
export type ProgressEntry = TimedEntry | CardioEntry;

export function trackingExerciseId(entry: ProgressEntry): string {
  return entry.exerciseId ?? `cardio:${(entry as CardioEntry).activity.toLowerCase()}`;
}

export function trackingEntries(payload: TrackingPayload, exerciseId?: string): ProgressEntry[] {
  return [...payload.timedSets.filter((entry) => entry.setType === "working"), ...payload.cardioEntries]
    .filter((entry) => exerciseId === undefined || trackingExerciseId(entry) === exerciseId);
}

export function trackingChoices(payload: TrackingPayload): TrackingExerciseChoice[] {
  const groups = new Map<string, ProgressEntry[]>();
  for (const entry of trackingEntries(payload)) {
    const id = trackingExerciseId(entry);
    const group = groups.get(id) ?? [];
    group.push(entry); groups.set(id, group);
  }
  return [...groups].map(([id, entries]) => {
    const latest = entries.reduce((a, b) => new Date(a.sessionDate) > new Date(b.sessionDate) ? a : b);
    const timed = "setType" in latest;
    return { id, name: timed ? latest.exerciseName : latest.activity, kind: timed ? "time" as const : "cardio" as const,
      category: timed ? "Time" : "Cardio", plottedUnit: "days" as const,
      lastDoneAt: latest.sessionDate, plottedSetCount: new Set(entries.map((entry) => localDayKey(entry.sessionDate))).size };
  }).sort((a, b) => new Date(b.lastDoneAt).getTime() - new Date(a.lastDoneAt).getTime() || a.name.localeCompare(b.name));
}

export function trackingValue(entry: ProgressEntry, metric: TrackingMetric): number | null {
  if (metric === "duration") return entry.durationSeconds;
  if (metric === "load") return "setType" in entry ? Number(entry.addedWeightKg ?? 0) : null;
  return "distanceMetres" in entry && entry.distanceMetres !== null ? Number(entry.distanceMetres) / 1000 : null;
}

function compareEntries(a: ProgressEntry, b: ProgressEntry, metric: TrackingMetric): number {
  const primary = (trackingValue(a, metric) ?? 0) - (trackingValue(b, metric) ?? 0);
  if (primary) return primary;
  // Equal-distance efforts favor the faster time; holds favor the longer duration.
  const secondary = metric === "distance" ? b.durationSeconds - a.durationSeconds : metric === "load" ? a.durationSeconds - b.durationSeconds : (trackingValue(a, "load") ?? trackingValue(a, "distance") ?? 0) - (trackingValue(b, "load") ?? trackingValue(b, "distance") ?? 0);
  return secondary || b.id.localeCompare(a.id);
}

export function trackingDays(entries: ProgressEntry[], metric: TrackingMetric): TrackingDay[] {
  const days = new Map<string, ProgressEntry>();
  for (const entry of entries) {
    if (("setType" in entry && entry.setType !== "working") || trackingValue(entry, metric) === null) continue;
    const day = localDayKey(entry.sessionDate);
    const previous = days.get(day);
    if (!previous || compareEntries(entry, previous, metric) > 0) days.set(day, entry);
  }
  const sorted = [...days.values()].sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime());
  return sorted.map((entry, index) => ({ date: entry.sessionDate, time: new Date(entry.sessionDate).getTime(), id: entry.id,
    value: trackingValue(entry, metric)!, changed: index === 0 || trackingValue(entry, metric) !== trackingValue(sorted[index - 1]!, metric),
    detail: "setType" in entry ? timedLabel(entry) : [cardioLabel(entry), cardioDetail(entry)].filter(Boolean).join(", ") }));
}

export function trackingRange(entries: ProgressEntry[], window: ChartWindow, now = Date.now()): ProgressEntry[] {
  const cutoff = windowStart(window, now);
  return entries.filter((entry) => cutoff === null || new Date(entry.sessionDate).getTime() >= cutoff);
}

export function trackingMetricLabel(metric: TrackingMetric): string {
  return metric === "load" ? "Added weight, kg" : metric === "distance" ? "Distance, km" : "Duration";
}

export function formatTrackingValue(value: number, metric: TrackingMetric): string {
  return metric === "duration" ? formatDuration(value) : Number(value.toFixed(2)).toLocaleString();
}
