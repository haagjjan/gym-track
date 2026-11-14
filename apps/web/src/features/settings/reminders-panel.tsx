"use client";

import { useState, type ReactNode } from "react";
import { cancelNotifications, notificationPermission, requestNotificationPermission, scheduleNotification } from "../../shared/platform/native";
import { useScopedLocalStorage } from "../privacy/use-scoped-local-storage";
import { DEFAULT_REMINDER, REMINDER_IDS, decodeReminder, reminderNotifications, type ReminderPreference } from "./reminder-schedule";
import { Group, Row, SwitchRow, SavedStatus, inputClass, useSavedFlash } from "./settings-ui";

const codec = { decode: decodeReminder };
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function RemindersPanel(): ReactNode {
  const { value, save, isLoaded } = useScopedLocalStorage("body-cockpit.reminders.v1", DEFAULT_REMINDER, codec);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const { saved, flash } = useSavedFlash();

  async function change(next: ReminderPreference): Promise<void> {
    setBusy(true);
    setMessage("");
    try {
      if (next.enabled) {
        const permission = await notificationPermission();
        const allowed = permission === "granted" || (permission === "prompt" && await requestNotificationPermission());
        if (!allowed) {
          setMessage("Allow notifications for GymTrack in your phone’s settings to use reminders.");
          return;
        }
      }
      await cancelNotifications(REMINDER_IDS);
      try {
        for (const notification of reminderNotifications(next)) await scheduleNotification(notification);
      } catch (error) {
        await cancelNotifications(REMINDER_IDS);
        save({ ...next, enabled: false });
        throw error;
      }
      save(next);
      flash();
    } catch {
      setMessage("Couldn’t update reminders. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-footnote text-text-secondary">Choose when to train. Reminders stay on this device.</p>
      <Group>
        <SwitchRow checked={value.enabled} disabled={!isLoaded || busy} label="Workout reminders" onChange={(enabled) => void change({ ...value, enabled })} />
        <Row>
          <fieldset disabled={!isLoaded || busy}>
            <legend className="mb-2 text-subhead text-text-secondary">Days</legend>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day, index) => {
                const weekday = (index + 1) as ReminderPreference["weekdays"][number];
                const checked = value.weekdays.includes(weekday);
                return <button aria-label={day} aria-pressed={checked} className={`min-h-11 min-w-11 rounded-full px-3 text-subhead ${checked ? "bg-accent text-on-accent" : "bg-surface-raised text-text"}`} disabled={checked && value.weekdays.length === 1} key={day} onClick={() => void change({ ...value, weekdays: checked ? value.weekdays.filter((d) => d !== weekday) : [...value.weekdays, weekday] })} type="button">{day.slice(0, 3)}</button>;
              })}
            </div>
          </fieldset>
        </Row>
        <Row>
          <label className="text-subhead text-text-secondary">Time
            <input className={`${inputClass} mt-2`} disabled={!isLoaded || busy} onChange={(event) => {
              const [hour, minute] = event.currentTarget.value.split(":").map(Number);
              if (hour !== undefined && minute !== undefined && Number.isInteger(hour) && Number.isInteger(minute)) void change({ ...value, hour, minute });
            }} type="time" value={`${String(value.hour).padStart(2, "0")}:${String(value.minute).padStart(2, "0")}`} />
          </label>
        </Row>
      </Group>
      {message ? <p className="text-footnote text-text-secondary" role="status">{message}</p> : <SavedStatus saved={saved} />}
    </div>
  );
}
