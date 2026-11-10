"use client";

import { useScopedLocalStorage, type StorageCodec } from "../privacy/use-scoped-local-storage";

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

function isFavoriteLift(item: unknown): item is FavoriteLift {
  return (
    typeof item === "object" &&
    item !== null &&
    typeof (item as FavoriteLift).id === "string" &&
    typeof (item as FavoriteLift).name === "string"
  );
}

function clampFavorites(list: FavoriteLift[]): FavoriteLift[] {
  return list.slice(0, MAX_FAVORITE_LIFTS);
}

const NO_FAVORITES: FavoriteLift[] = [];

const codec: StorageCodec<FavoriteLift[]> = {
  decode: (raw) => {
    const parsed = JSON.parse(raw) as unknown;

    return Array.isArray(parsed) ? clampFavorites(parsed.filter(isFavoriteLift)) : undefined;
  }
};

export function useFavoriteLifts(): {
  favorites: FavoriteLift[];
  save: (next: FavoriteLift[]) => void;
  isLoaded: boolean;
} {
  const { value, save, isLoaded } = useScopedLocalStorage(
    STORAGE_KEY,
    NO_FAVORITES,
    codec,
    clampFavorites
  );

  return { favorites: value, save, isLoaded };
}
