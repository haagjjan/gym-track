"use client";

import { useCallback, useEffect, useState } from "react";
import { scopedStorageKey, useDevicePrivacy } from "../privacy/device-privacy";

/**
 * User-pinned favorite lifts for the dashboard PERFORMANCE_PB panel (chosen in
 * Settings). Stored client-side — user-pinned PBs are a flagged API gap in the
 * Phase 0 contract, same treatment as biometrics.
 */
export interface FavoriteLift {
  id: string;
  name: string;
}

export const MAX_FAVORITE_LIFTS = 3;

const STORAGE_KEY = "body-cockpit.favorite-lifts.v1";

export function useFavoriteLifts(): {
  favorites: FavoriteLift[];
  save: (next: FavoriteLift[]) => void;
  isLoaded: boolean;
} {
  const { functionalStorageEnabled, userId } = useDevicePrivacy();
  const storageKey = scopedStorageKey(STORAGE_KEY, userId);
  const [favorites, setFavorites] = useState<FavoriteLift[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = functionalStorageEnabled ? window.localStorage.getItem(storageKey) : null;

      if (raw) {
        const parsed = JSON.parse(raw) as unknown;

        if (Array.isArray(parsed)) {
          setFavorites(
            parsed
              .filter(
                (item): item is FavoriteLift =>
                  typeof item === "object" &&
                  item !== null &&
                  typeof (item as FavoriteLift).id === "string" &&
                  typeof (item as FavoriteLift).name === "string"
              )
              .slice(0, MAX_FAVORITE_LIFTS)
          );
        }
      } else if (!functionalStorageEnabled) {
        setFavorites([]);
      }
    } catch {
      // Corrupt storage falls back to the derived top lifts.
    }

    setIsLoaded(true);
  }, [functionalStorageEnabled, storageKey]);

  const save = useCallback((next: FavoriteLift[]): void => {
    const clamped = next.slice(0, MAX_FAVORITE_LIFTS);

    setFavorites(clamped);

    try {
      if (functionalStorageEnabled) window.localStorage.setItem(storageKey, JSON.stringify(clamped));
    } catch {
      // Private-mode quota errors are non-fatal; selection lasts the session.
    }
  }, [functionalStorageEnabled, storageKey]);

  return { favorites, save, isLoaded };
}
