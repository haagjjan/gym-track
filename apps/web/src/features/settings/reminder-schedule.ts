import type { NativeNotification } from "../../shared/platform/native";

type Weekday = NonNullable<NativeNotification["repeatWeekly"]>["weekday"];
export interface ReminderPreference { enabled: boolean; weekdays: Weekday[]; hour: number; minute: number }
export const DEFAULT_REMINDER: ReminderPreference = { enabled: false, weekdays: [2, 4, 6], hour: 18, minute: 0 };
export const REMINDER_IDS = [201, 202, 203, 204, 205, 206, 207];

export function decodeReminder(raw: string): ReminderPreference | undefined {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object") return undefined;
  const p = value as Partial<ReminderPreference>;
  if (typeof p.enabled !== "boolean" || !Array.isArray(p.weekdays) || p.weekdays.length === 0
    || !p.weekdays.every((day) => Number.isInteger(day) && day >= 1 && day <= 7)
    || !Number.isInteger(p.hour) || p.hour! < 0 || p.hour! > 23
    || !Number.isInteger(p.minute) || p.minute! < 0 || p.minute! > 59) return undefined;
  return { enabled: p.enabled, weekdays: [...new Set(p.weekdays)], hour: p.hour!, minute: p.minute! };
}

/** Stable ids reserve one slot per weekday, separate from the rest timer. */
export function reminderNotifications(preference: ReminderPreference): NativeNotification[] {
  if (!preference.enabled) return [];
  return [...new Set(preference.weekdays)].map((weekday) => ({
    id: 200 + weekday,
    title: "Time to train",
    body: "Your workout is waiting.",
    at: new Date(0), // Weekly schedules use the calendar components instead of this date.
    repeatWeekly: { weekday, hour: preference.hour, minute: preference.minute }
  }));
}
