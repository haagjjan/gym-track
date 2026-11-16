export type HapticKind = "light" | "success" | "warning" | "selection" | "heavy";
export type NotificationPermission = "granted" | "denied" | "prompt";
export interface NativeNotification {
  id: number;
  title: string;
  body: string;
  at: Date;
  repeatWeekly?: { weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7; hour: number; minute: number };
}

/**
 * What the native shell does for the UI. The web build has no bridge; the mobile
 * build registers one at startup (apps/mobile). Keeping the plugins behind this
 * interface keeps Capacitor out of the web bundle.
 */
export interface NativeBridge {
  platform(): "ios" | "android" | "web";
  providerSignIn(provider: "apple" | "google", nonce: string): Promise<{ idToken: string } | "cancelled">;
  /** Opens a link outside the app, in the system browser sheet. */
  openExternal(url: string): Promise<void>;
  /** Hands a file to the system share sheet. */
  shareFile(file: File): Promise<"saved" | "cancelled">;
  /** Short tactile feedback. */
  haptic(kind: HapticKind): void;
  scheduleNotification(notification: NativeNotification): Promise<void>;
  cancelNotifications(ids: number[]): Promise<void>;
  notificationPermission(): Promise<NotificationPermission>;
  requestNotificationPermission(): Promise<boolean>;
}

let bridge: NativeBridge | null = null;

export function setNativeBridge(next: NativeBridge | null): void {
  bridge = next;
}

export function getNativeBridge(): NativeBridge | null {
  return bridge;
}

/** Tactile feedback where the shell supports it; nothing on the web. */
export function haptic(kind: HapticKind): void {
  bridge?.haptic(kind);
}

export async function scheduleNotification(notification: NativeNotification): Promise<void> {
  await bridge?.scheduleNotification(notification);
}

export async function cancelNotifications(ids: number[]): Promise<void> {
  await bridge?.cancelNotifications(ids);
}

export async function notificationPermission(): Promise<NotificationPermission> {
  return bridge ? bridge.notificationPermission() : "denied";
}

export async function requestNotificationPermission(): Promise<boolean> {
  return bridge ? bridge.requestNotificationPermission() : false;
}
