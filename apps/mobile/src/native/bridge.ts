import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Share } from "@capacitor/share";
import type { NativeBridge } from "../../../web/src/shared/platform/native";

/** The native side of the UI's platform interface, backed by Capacitor plugins. */
export const capacitorBridge: NativeBridge = {
  platform() {
    const platform = Capacitor.getPlatform();
    return platform === "ios" || platform === "android" ? platform : "web";
  },

  // Stub until the owner supplies client IDs and native provider plugins are added.
  async providerSignIn() {
    throw new Error("Sign-in with this provider is not set up in this build.");
  },

  async openExternal(url) {
    await Browser.open({ url });
  },

  async shareFile(file) {
    const written = await Filesystem.writeFile({
      path: file.name,
      data: await toBase64(file),
      directory: Directory.Cache
    });

    try {
      await Share.share({ files: [written.uri] });
      return "saved";
    } catch {
      // The share sheet rejects when the user closes it without choosing.
      return "cancelled";
    }
  },

  async scheduleNotification({ at, repeatWeekly, ...notification }) {
    await LocalNotifications.schedule({ notifications: [{
      ...notification,
      foreground: false,
      isExactNotification: false,
      schedule: repeatWeekly ? { on: repeatWeekly, repeats: true } : { at }
    }] });
  },

  async cancelNotifications(ids) {
    await LocalNotifications.cancel({ notifications: ids.map((id) => ({ id })) });
  },

  async notificationPermission() {
    const { display } = await LocalNotifications.checkPermissions();
    return display === "prompt-with-rationale" ? "prompt" : display;
  },

  async requestNotificationPermission() {
    return (await LocalNotifications.requestPermissions()).display === "granted";
  },

  haptic(kind) {
    const run = kind === "selection" ? Haptics.selectionChanged()
      : kind === "heavy" ? Haptics.impact({ style: ImpactStyle.Heavy })
      : kind === "light"
      ? Haptics.impact({ style: ImpactStyle.Light })
      : Haptics.notification({ type: kind === "success" ? NotificationType.Success : NotificationType.Warning });

    void run.catch(() => undefined);
  }
};

async function toBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";

  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }

  return btoa(binary);
}
