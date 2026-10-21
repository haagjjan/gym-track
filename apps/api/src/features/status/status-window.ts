const DAY_MS = 86_400_000;

/** One UTC cutoff governs both rolling activity and Monday-based calendar weeks. */
export function statusWindow(at: Date): { since30Days: Date; weekStarts: string[] } {
  const monday = new Date(at);
  monday.setUTCHours(0, 0, 0, 0);
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
  return {
    since30Days: new Date(at.getTime() - 30 * DAY_MS),
    weekStarts: Array.from({ length: 8 }, (_, index) =>
      new Date(monday.getTime() - (7 - index) * 7 * DAY_MS).toISOString().slice(0, 10))
  };
}
