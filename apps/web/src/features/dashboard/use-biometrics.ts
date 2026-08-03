"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Biometrics are a flagged API gap (docs/11 Phase 0): no backend endpoint exists.
 * Stored client-side so the cockpit biometric panel renders real values;
 * swap to an API-backed profile when the endpoint lands.
 */
export interface Biometrics {
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  bodyFatPct: number | null;
}

const STORAGE_KEY = "body-cockpit.biometrics.v1";

export const emptyBiometrics: Biometrics = {
  age: null,
  heightCm: null,
  weightKg: null,
  bodyFatPct: null
};

export function useBiometrics(): {
  biometrics: Biometrics;
  save: (next: Biometrics) => void;
  isLoaded: boolean;
} {
  const [biometrics, setBiometrics] = useState<Biometrics>(emptyBiometrics);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);

      if (raw) {
        setBiometrics({ ...emptyBiometrics, ...(JSON.parse(raw) as Partial<Biometrics>) });
      }
    } catch {
      // Corrupt storage falls back to empty values.
    }

    setIsLoaded(true);
  }, []);

  const save = useCallback((next: Biometrics): void => {
    setBiometrics(next);

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Private-mode quota errors are non-fatal; values stay for the session.
    }
  }, []);

  return { biometrics, save, isLoaded };
}
