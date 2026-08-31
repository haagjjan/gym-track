"use client";

import { useCallback, useEffect, useState } from "react";
import { scopedStorageKey, useDevicePrivacy } from "../privacy/device-privacy";

/**
 * Device-local display preferences, stored like biometrics and favourite lifts.
 *
 * The Volume screen used to offer a flat front/back map here as an alternative
 * to the 3D body. That choice is gone — the 3D body is the only renderer — so
 * any `volumeBodyMap` value left in a browser's storage is simply ignored.
 */
export interface DisplaySettings {
  autoSpin: boolean;
}

const STORAGE_KEY = "body-cockpit.display.v1";

export const defaultDisplaySettings: DisplaySettings = {
  autoSpin: true
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
              : defaultDisplaySettings.autoSpin
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
