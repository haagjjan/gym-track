const trackingCsvColumns = ["format_version", "workout_key", "workout_started_at", "workout_ended_at", "workout_title", "workout_type", "workout_notes", "entry_kind", "entry_recorded_at", "exercise_name", "activity", "set_type", "duration_seconds", "added_weight_kg", "distance_metres", "average_heart_rate", "calories", "note"] as const;
type TrackingFixtureRow = Record<(typeof trackingCsvColumns)[number], string>;

/** Twelve workouts ending yesterday: repeated holds, warm-ups and cardio with optional metrics. */
export function trackingProgressFixture(): string {
  const rows: TrackingFixtureRow[] = [];
  for (let week = 0; week < 6; week++) {
    for (let day = 0; day < 2; day++) {
      const start = new Date();
      start.setDate(start.getDate() - 39 + week * 7 + day * 3);
      start.setHours(17, 0, 0, 0);
      const end = new Date(start.getTime() + 55 * 60000);
      let minute = 2;
      const add = (kind: string, name: string, seconds: number, extra: Partial<TrackingFixtureRow> = {}) => {
        const row = Object.fromEntries(trackingCsvColumns.map(key => [key, ''])) as TrackingFixtureRow;
        rows.push({ ...row, format_version: 'gymtrack-tracking-v1', workout_key: `sample-${week}-${day}`,
          workout_started_at: start.toISOString(), workout_ended_at: end.toISOString(),
          workout_title: `Sample ${day ? 'holds and intervals' : 'holds and endurance'}`,
          workout_type: 'Mixed', workout_notes: 'Synthetic sample workout for reviewing time and cardio progress.',
          entry_kind: kind, entry_recorded_at: new Date(start.getTime() + minute++ * 60000).toISOString(),
          exercise_name: kind === 'time' ? name : '', activity: kind === 'cardio' ? name : '',
          duration_seconds: String(seconds), ...extra });
      };
      add('time', 'Dead hang', 20, { set_type: 'warmup', note: 'Easy warm-up' });
      for (let set = 0; set < 3; set++) {
        add('time', 'Dead hang', 40 + week * 5 - set * 5 + day * 2, { set_type: 'working', added_weight_kg: week < 2 ? '' : String((week - 1) * 2.5) });
        add('time', 'Wall Sit', 45 + week * 10 - set * 5, { set_type: 'working', added_weight_kg: week >= 4 ? '5' : '' });
      }
      if (!day) {
        add('cardio', 'Treadmill Run', 1800 - week * 30, { distance_metres: '5000', average_heart_rate: String(152 - week), calories: '300' });
        add('cardio', 'Stationary Bike', 480 + week * 30, { note: 'Easy cooldown, distance not recorded' });
      } else {
        for (let interval = 0; interval < 3; interval++) add('cardio', 'Rowing Machine', 150 - week * 3 + interval * 2,
          { distance_metres: '500', average_heart_rate: String(155 + interval * 3), note: `Interval ${interval + 1}` });
      }
    }
  }
  const escape = (value: string): string => `"${value.replaceAll('"', '""')}"`;
  return [trackingCsvColumns.join(","), ...rows.map((row) => trackingCsvColumns.map((column) => escape(row[column])).join(","))].join("\n");
}
