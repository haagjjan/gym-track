// Only aggregate counts cross this boundary. Optional additions cannot erase legacy totals.
export function parseMetrics(data, generatedAt) {
  const activeBetaAccounts = thresholded(data.activeBetaAccounts);
  const activeAccounts = data.activeAccounts === undefined ? null : thresholded(data.activeAccounts);
  const recent = optional(() => count(data.completedWorkoutsLast30Days));
  const weeks = optional(() => weeklyCounts(data.completedWorkoutsByWeek, generatedAt));
  return {
    generatedAt, activeBetaAccounts, activeAccounts,
    workoutRecordsProcessed: count(data.workoutRecordsProcessed),
    completedWorkoutsLast30Days: recent, completedWorkoutsByWeek: weeks
  };
}

function optional(parse) {
  try { return parse(); } catch { return null; }
}

function thresholded(value) {
  if (value?.kind === "below_threshold" && value.threshold === 5) return { kind: "below_threshold", threshold: 5 };
  if (value?.kind === "exact" && count(value.value) >= 5) return { kind: "exact", value: value.value };
  throw new Error("Invalid account disclosure");
}

function count(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Invalid count");
  return value;
}

function weeklyCounts(value, generatedAt) {
  if (!Array.isArray(value) || value.length !== 8) throw new Error("Invalid weekly activity");
  const monday = new Date(generatedAt);
  monday.setUTCHours(0, 0, 0, 0);
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7 - 49);
  return value.map((entry, index) => {
    const expected = new Date(monday.getTime() + index * 7 * 86_400_000).toISOString().slice(0, 10);
    if (entry?.weekStart !== expected) throw new Error("Invalid activity week");
    return { weekStart: expected, count: count(entry.count) };
  });
}
