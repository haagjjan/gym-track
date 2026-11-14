import { Capacitor } from "@capacitor/core";
import { configureAppTransport } from "../../web/src/shared/api/transport";
import { setNativeBridge } from "../../web/src/shared/platform/native";
import { appConfig } from "./config";
import { capacitorBridge } from "./native/bridge";
import { secureTokenStore } from "./native/token-store";
import { forgetUser } from "./session/user-cache";

/**
 * Runs once when the bundle loads, before any screen renders or fetches: points
 * the API layer at apps/api and registers the native plugins.
 */
if (typeof window !== "undefined") {
  configureAppTransport({
    apiOrigin: appConfig.apiOrigin,
    appVersion: appConfig.version,
    tokenStore: secureTokenStore,
    onSessionChange: (event) => {
      forgetUser();

      if (event === "expired") {
        window.location.replace("/login/");
      }
    },
    onUpdateRequired: () => {
      if (!window.location.pathname.startsWith("/update")) {
        window.location.replace("/update/");
      }
    }
  });

  if (Capacitor.isNativePlatform()) {
    setNativeBridge(capacitorBridge);
  }
}
