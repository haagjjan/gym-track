import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_REMINDER, REMINDER_IDS, decodeReminder, reminderNotifications } from "./reminder-schedule";

describe("workout reminders", () => {
  it("does not schedule disabled reminders", () => {
    assert.deepEqual(reminderNotifications(DEFAULT_REMINDER), []);
  });
  it("maps calendar weekdays to distinct stable ids and the selected local time", () => {
    const notifications = reminderNotifications({ enabled: true, weekdays: [1, 7, 1], hour: 23, minute: 59 });
    assert.deepEqual(notifications.map(({ id, repeatWeekly }) => ({ id, repeatWeekly })), [
      { id: 201, repeatWeekly: { weekday: 1, hour: 23, minute: 59 } },
      { id: 207, repeatWeekly: { weekday: 7, hour: 23, minute: 59 } }
    ]);
    assert.ok(notifications.every((n) => REMINDER_IDS.includes(n.id) && n.id !== 100));
    assert.equal(notifications[0]?.title, "Time to train");
    assert.equal(notifications[0]?.body, "Your workout is waiting.");
  });
  it("rejects invalid stored preferences and deduplicates days", () => {
    for (const patch of [{ weekdays: [] }, { weekdays: [0] }, { weekdays: [8] }, { hour: 24 }, { minute: -1 }, { enabled: "yes" }]) {
      assert.equal(decodeReminder(JSON.stringify({ ...DEFAULT_REMINDER, ...patch })), undefined);
    }
    assert.deepEqual(decodeReminder(JSON.stringify({ ...DEFAULT_REMINDER, weekdays: [2, 2] }))?.weekdays, [2]);
  });
});
