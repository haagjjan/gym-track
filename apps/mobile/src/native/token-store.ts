import { SecureStorage } from "@aparajita/capacitor-secure-storage";
import type { SessionTokenStore } from "../../../web/src/shared/api/transport";

const TOKEN_KEY = "session-token";
/** Set before a token is removed, so a failed removal is finished at the next start. */
const SIGNED_OUT_MARKER = "gymtrack.app.signed-out";

function mark(signedOut: boolean): void {
  try {
    if (signedOut) window.localStorage.setItem(SIGNED_OUT_MARKER, "1");
    else window.localStorage.removeItem(SIGNED_OUT_MARKER);
  } catch {
    // Without web storage the Keychain call below is the only record.
  }
}

function markedSignedOut(): boolean {
  try {
    return window.localStorage.getItem(SIGNED_OUT_MARKER) === "1";
  } catch {
    return false;
  }
}

/**
 * Session token in the iOS Keychain / Android Keystore (ADR 0023). In a desktop
 * browser, used only for development, the plugin falls back to web storage.
 */
export const secureTokenStore: SessionTokenStore = {
  async load() {
    if (markedSignedOut()) {
      await SecureStorage.remove(TOKEN_KEY);
      mark(false);
      return null;
    }

    const value = await SecureStorage.get(TOKEN_KEY);

    return typeof value === "string" && value.length > 0 ? value : null;
  },
  async save(token) {
    await SecureStorage.set(TOKEN_KEY, token);
    mark(false);
  },
  async clear() {
    mark(true);
    await SecureStorage.remove(TOKEN_KEY);
    mark(false);
  }
};
