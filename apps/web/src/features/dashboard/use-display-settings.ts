"use client";

import { useCallback, useEffect, useState } from "react";
import { scopedStorageKey, useDevicePrivacy } from "../privacy/device-privacy";

/**
 * Cockpit display preferences (device-local, like biometrics/favorite lifts):
 * dashboard avatar motion plus the preferred Volume body-map renderer.
 */
export interface DisplaySettings {
  autoSpin: boolean;
  volumeBodyMap: "3d" | "2d";
}

const STORAGE_KEY = "body-cockpit.display.v1";

export const defaultDisplaySettings: DisplaySettings = {
  autoSpin: true,
  volumeBodyMap: "3d"
};

export function useDisplaySettings(): {
  settings: DisplaySettings;
  save: (next: DisplaySettings) => void;
  isLoaded: boolean;
} {
  const { functionalStorageEnabled, userId } = useDevicePrivacy();
  const storageKey = scopedStorageKey(STORAGE_KEY, userId);
  const [settings, setSettings] = useState<DisplaySettings>(defaultDisplaySettings);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = functionalStorageEnabled ? window.localStorage.getItem(storageKey) : null;

      if (raw) {
        const stored = JSON.parse(raw) as Partial<DisplaySettings>;

        setSettings({
          autoSpin:
            typeof stored.autoSpin === "boolean"
              ? stored.autoSpin
              : defaultDisplaySettings.autoSpin,
          volumeBodyMap: stored.volumeBodyMap === "2d" ? "2d" : "3d"
        });
      } else if (!functionalStorageEnabled) {
        setSettings(defaultDisplaySettings);
      }
    } catch {
      // Corrupt storage falls back to defaults.
    }

    setIsLoaded(true);
  }, [functionalStorageEnabled, storageKey]);

  const save = useCallback((next: DisplaySettings): void => {
    setSettings(next);

    try {
      if (functionalStorageEnabled) window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Private-mode quota errors are non-fatal; values stay for the session.
    }
  }, [functionalStorageEnabled, storageKey]);

  return { settings, save, isLoaded };
}
