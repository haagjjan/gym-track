"use client";

import { useScopedLocalStorage, type StorageCodec } from "../privacy/use-scoped-local-storage";

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

const codec: StorageCodec<DisplaySettings> = {
  decode: (raw) => {
    const stored = JSON.parse(raw) as Partial<DisplaySettings>;

    return {
      autoSpin:
        typeof stored.autoSpin === "boolean" ? stored.autoSpin : defaultDisplaySettings.autoSpin
    };
  }
};

export function useDisplaySettings(): {
  settings: DisplaySettings;
  save: (next: DisplaySettings) => void;
  isLoaded: boolean;
} {
  const { value, save, isLoaded } = useScopedLocalStorage(
    STORAGE_KEY,
    defaultDisplaySettings,
    codec
  );

  return { settings: value, save, isLoaded };
}
