import { Capacitor } from "@capacitor/core";
import { onlineManager } from "@tanstack/react-query";
import { configureAppTransport } from "../../web/src/shared/api/transport";
import { setNativeBridge } from "../../web/src/shared/platform/native";
import { appConfig } from "./config";
import { capacitorBridge } from "./native/bridge";
import { deviceRemove } from "./offline/device-store";
import { secureTokenStore } from "./native/token-store";
import { forgetUser } from "./session/user-cache";

const CACHE_KEY = "gymtrack.app.query-cache.v1";

/** Another account must never see the previous account's cached answers. */
function clearReadCache(): void {
  try {
    deviceRemove(CACHE_KEY);
  } catch {
    // Nothing stored.
  }
}

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
      clearReadCache();

      if (event === "expired") {
        window.location.replace("/login/");
      }
    },
    // A WebView can report "online" in airplane mode. What counts is whether the API
    // answers: while it does not, queries pause and keep showing the stored answers
    // instead of failing (ADR 0025, stage 1).
    onReachabilityChange: (reachable) => {
      onlineManager.setOnline(reachable);
    },
    onStorageError: (operation) => {
      console.warn(`Secure storage ${operation} failed.`);
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
