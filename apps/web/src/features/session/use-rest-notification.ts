"use client";

import { useEffect } from "react";
import { cancelNotifications, notificationPermission, requestNotificationPermission, scheduleNotification } from "../../shared/platform/native";

export const REST_NOTIFICATION_ID = 100;
let pending = Promise.resolve();
let permissionRequest: Promise<boolean> | undefined;

function enqueue(action: () => Promise<void>): void {
  pending = pending.then(action).catch(() => undefined);
}

async function allowNotifications(): Promise<boolean> {
  const permission = await notificationPermission();
  if (permission !== "prompt") return permission === "granted";
  permissionRequest ??= requestNotificationPermission().finally(() => { permissionRequest = undefined; });
  return permissionRequest;
}

/** Queue the end alert, cancelling just before delivery while the timer is visible. */
export function useRestNotification(startedAt: number, seconds: number): void {
  useEffect(() => {
    let disposed = false;
    const end = startedAt + seconds * 1000;
    const permission = allowNotifications();
    function update(): void {
      enqueue(async () => {
        await cancelNotifications([REST_NOTIFICATION_ID]);
        if (!await permission || disposed || (document.visibilityState === "visible" && end - Date.now() <= 500) || end <= Date.now()) return;
        await scheduleNotification({ id: REST_NOTIFICATION_ID, title: "Rest is over", body: "Time for your next set.", at: new Date(end) });
      });
    }
    update();
    document.addEventListener("visibilitychange", update);
    const timeout = window.setTimeout(() => { if (document.visibilityState === "visible") update(); }, Math.max(0, end - Date.now() - 500));
    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      document.removeEventListener("visibilitychange", update);
      enqueue(() => cancelNotifications([REST_NOTIFICATION_ID]));
    };
  }, [startedAt, seconds]);
}
