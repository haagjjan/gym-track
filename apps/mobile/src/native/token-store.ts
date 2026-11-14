import { SecureStorage } from "@aparajita/capacitor-secure-storage";
import type { SessionTokenStore } from "../../../web/src/shared/api/transport";

const TOKEN_KEY = "session-token";

/**
 * Session token in the iOS Keychain / Android Keystore (ADR 0023). In a desktop
 * browser, used only for development, the plugin falls back to web storage.
 */
export const secureTokenStore: SessionTokenStore = {
  async load() {
    const value = await SecureStorage.get(TOKEN_KEY);

    return typeof value === "string" && value.length > 0 ? value : null;
  },
  async save(token) {
    await SecureStorage.set(TOKEN_KEY, token);
  },
  async clear() {
    await SecureStorage.remove(TOKEN_KEY);
  }
};
