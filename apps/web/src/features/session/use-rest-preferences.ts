"use client";

import { useCallback, useEffect, useState } from "react";
import { scopedStorageKey, useDevicePrivacy } from "../privacy/device-privacy";

/**
 * How long the rest countdown runs after a saved set.
 *
 * Rest length is a personal, per-device habit rather than account data, so it
 * is stored beside the other device-local preferences (biometrics, favourite
 * lifts, display) and never leaves the browser.
 */
export const REST_STEP_SECONDS = 15;
export const REST_MIN_SECONDS = 0;
export const REST_MAX_SECONDS = 600;
export const DEFAULT_REST_SECONDS = 120;

const STORAGE_KEY = "body-cockpit.rest.v1";

/** Clamps to 0–10 minutes and snaps to the nearest quarter minute. */
export function normaliseRestSeconds(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_REST_SECONDS;
  const snapped = Math.round(value / REST_STEP_SECONDS) * REST_STEP_SECONDS;
  return Math.min(REST_MAX_SECONDS, Math.max(REST_MIN_SECONDS, snapped));
}

/** `120` → `2:00`, `0` → `Off`. */
export function formatRestSeconds(value: number): string {
  if (value <= 0) return "Off";
  const minutes = Math.floor(value / 60);
  return `${minutes}:${String(value % 60).padStart(2, "0")}`;
}

/**
 * Reads the stored rest length without the device-privacy context.
 *
 * The live workout screen deliberately renders outside `AppShell`, so it has no
 * provider to read from. It never needs one: the value is only ever written
 * from Settings, which does sit inside the provider and does honour the
 * functional-storage choice. A browser that never consented has nothing stored
 * here, so this read simply returns the default.
 *
 * Call this from an event handler, not during render — it touches
 * `localStorage`, which does not exist on the server.
 */
export function readRestSeconds(userId: string): number {
  try {
    const raw = window.localStorage.getItem(scopedStorageKey(STORAGE_KEY, userId));

    return raw === null ? DEFAULT_REST_SECONDS : normaliseRestSeconds(Number(raw));
  } catch {
    return DEFAULT_REST_SECONDS;
  }
}

export function useRestPreference(): {
  restSeconds: number;
  save: (next: number) => void;
  isLoaded: boolean;
} {
  const { functionalStorageEnabled, userId } = useDevicePrivacy();
  const storageKey = scopedStorageKey(STORAGE_KEY, userId);
  const [restSeconds, setRestSeconds] = useState(DEFAULT_REST_SECONDS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = functionalStorageEnabled ? window.localStorage.getItem(storageKey) : null;

      setRestSeconds(raw === null ? DEFAULT_REST_SECONDS : normaliseRestSeconds(Number(raw)));
    } catch {
      // Corrupt or unavailable storage falls back to the default.
      setRestSeconds(DEFAULT_REST_SECONDS);
    }

    setIsLoaded(true);
  }, [functionalStorageEnabled, storageKey]);

  const save = useCallback((next: number): void => {
    const bounded = normaliseRestSeconds(next);
    setRestSeconds(bounded);

    try {
      if (functionalStorageEnabled) window.localStorage.setItem(storageKey, String(bounded));
    } catch {
      // Private-mode quota errors are non-fatal; the value stays for the session.
    }
  }, [functionalStorageEnabled, storageKey]);

  return { restSeconds, save, isLoaded };
}
