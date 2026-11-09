export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

export function formatKgValue(value: string | number): string {
  const parsed = typeof value === "number" ? value : Number(value);

  if (Number.isNaN(parsed)) {
    return String(value);
  }

  return parsed % 1 === 0 ? String(parsed) : parsed.toFixed(1);
}

export function durationMinutes(startedAt: string, endedAt: string | null): number {
  const end = endedAt ? new Date(endedAt) : new Date();

  return Math.max(1, Math.round((end.getTime() - new Date(startedAt).getTime()) / 60_000));
}

/** Stopwatch time: "4:05", "1:02:09". */
export function formatClock(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  const pad = (value: number): string => String(value).padStart(2, "0");

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/** Workout length in words (DESIGN.md, Voice): "45 min", "1 h 12 min", "2 h". */
export function formatMinutes(startedAt: string, endedAt: string | null): string {
  const minutes = durationMinutes(startedAt, endedAt);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours} h ${remainder} min` : `${hours} h`;
}

const dayFormat = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });
const dayYearFormat = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const timeFormat = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

/** "Today", "Yesterday", "Mon 31 Aug"; the year only when it isn't this year. */
export function formatDay(value: string, now: Date = new Date()): string {
  const date = new Date(value);
  const startOfDay = (input: Date): number => new Date(input.getFullYear(), input.getMonth(), input.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return (date.getFullYear() === now.getFullYear() ? dayFormat : dayYearFormat).format(date).replace(",", "");
}

/** "Today, 18:05", "Mon 31 Aug, 18:05". */
export function formatDayTime(value: string, now: Date = new Date()): string {
  return `${formatDay(value, now)}, ${timeFormat.format(new Date(value))}`;
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** Calendar date with year: "9 Nov 2026". */
export function formatDate(value: string): string {
  return dateFormat.format(new Date(value));
}

/** Exact point in time, for admin tables and logs: "9 Nov 2026, 14:03". */
export function formatTimestamp(value: string): string {
  return `${formatDate(value)}, ${timeFormat.format(new Date(value))}`;
}
