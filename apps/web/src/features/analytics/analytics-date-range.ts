export function dateRange(days: number): { endDate: string; startDate: string } {
  const end = new Date();
  const start = new Date();

  start.setUTCDate(start.getUTCDate() - days);

  return {
    startDate: dateOnly(start),
    endDate: dateOnly(end)
  };
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}
