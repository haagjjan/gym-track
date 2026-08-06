export function cockpitLabel(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

export function shortDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short"
  })
    .format(new Date(value))
    .toUpperCase();
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

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

export function formatDuration(startedAt: string, endedAt: string | null): string {
  const minutes = durationMinutes(startedAt, endedAt);

  if (minutes < 60) {
    return `${minutes}M`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  return remainder > 0 ? `${hours}H ${remainder}M` : `${hours}H`;
}

export function formatElapsedSeconds(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  const pad = (value: number): string => String(value).padStart(2, "0");

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}
