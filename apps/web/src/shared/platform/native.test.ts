import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cancelNotifications, haptic, notificationPermission, requestNotificationPermission, scheduleNotification, setNativeBridge } from "./native";

describe("native helpers without a bridge", () => {
  it("does nothing on the website and reports notifications unavailable", async () => {
    setNativeBridge(null);
    for (const kind of ["light", "selection", "heavy", "success", "warning"] as const) haptic(kind);
    await scheduleNotification({ id: 100, title: "Rest is over", body: "Time for your next set.", at: new Date(0) });
    await cancelNotifications([100]);
    assert.equal(await notificationPermission(), "denied");
    assert.equal(await requestNotificationPermission(), false);
  });
});
