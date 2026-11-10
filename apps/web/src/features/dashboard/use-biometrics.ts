"use client";

import { useScopedLocalStorage, type StorageCodec } from "../privacy/use-scoped-local-storage";

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

const codec: StorageCodec<Biometrics> = {
  decode: (raw) => ({ ...emptyBiometrics, ...(JSON.parse(raw) as Partial<Biometrics>) })
};

export function useBiometrics(): {
  biometrics: Biometrics;
  save: (next: Biometrics) => void;
  isLoaded: boolean;
} {
  const { value, save, isLoaded } = useScopedLocalStorage(STORAGE_KEY, emptyBiometrics, codec);

  return { biometrics: value, save, isLoaded };
}
