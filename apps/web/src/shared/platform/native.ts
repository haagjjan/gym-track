/**
 * What the native shell does for the UI. The web build has no bridge; the mobile
 * build registers one at startup (apps/mobile). Keeping the plugins behind this
 * interface keeps Capacitor out of the web bundle.
 */
export interface NativeBridge {
  /** Opens a link outside the app, in the system browser sheet. */
  openExternal(url: string): Promise<void>;
  /** Hands a file to the system share sheet. */
  shareFile(file: File): Promise<"saved" | "cancelled">;
  /** Short tactile feedback. */
  haptic(kind: "light" | "success" | "warning"): void;
}

let bridge: NativeBridge | null = null;

export function setNativeBridge(next: NativeBridge | null): void {
  bridge = next;
}

export function getNativeBridge(): NativeBridge | null {
  return bridge;
}

/** Tactile feedback where the shell supports it; nothing on the web. */
export function haptic(kind: "light" | "success" | "warning"): void {
  bridge?.haptic(kind);
}
