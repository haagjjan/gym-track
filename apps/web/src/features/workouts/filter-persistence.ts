"use client";

import { useEffect, useState } from "react";

export type FilterSurface = "history" | "templates" | "exercises";

export interface StoredFacetFilters {
  muscleGroupIds: string[];
  equipment: string;
  exerciseType: string;
  ownership: "" | "editable" | "readOnly";
}

interface StoredFilterState<Sort extends string> {
  filters: StoredFacetFilters;
  sort: Sort;
}

interface PersistenceOptions<Sort extends string> {
  allowedSorts: readonly Sort[];
  defaultSort: Sort;
  surface: FilterSurface;
  userId: string;
}

export function usePersistentFilters<Sort extends string>(
  options: PersistenceOptions<Sort>
): StoredFilterState<Sort> & {
  clear: () => void;
  setFilters: (filters: StoredFacetFilters) => void;
  setSort: (sort: Sort) => void;
} {
  const { allowedSorts, defaultSort, surface, userId } = options;
  const [filters, setFilters] = useState<StoredFacetFilters>(emptyStoredFacetFilters);
  const [sort, setSort] = useState<Sort>(defaultSort);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const restored = readFilterState(window.sessionStorage, {
      allowedSorts,
      defaultSort,
      surface,
      userId
    });
    if (restored) {
      setFilters(restored.filters);
      setSort(restored.sort);
    }
    setHydrated(true);
  }, [allowedSorts, defaultSort, surface, userId]);

  useEffect(() => {
    if (!hydrated) return;
    writeFilterState(window.sessionStorage, userId, surface, { filters, sort });
  }, [filters, hydrated, surface, sort, userId]);

  function clear(): void {
    clearFilterState(window.sessionStorage, userId, surface);
    setFilters(emptyStoredFacetFilters());
    setSort(defaultSort);
  }

  return { clear, filters, setFilters, setSort, sort };
}

export function filterStorageKey(userId: string, surface: FilterSurface): string {
  return `gym-progress-tracker:filters:v1:${encodeURIComponent(userId)}:${surface}`;
}

export function readFilterState<Sort extends string>(
  storage: Pick<Storage, "getItem">,
  options: PersistenceOptions<Sort>
): StoredFilterState<Sort> | null {
  try {
    const raw = storage.getItem(filterStorageKey(options.userId, options.surface));
    if (!raw) return null;
    return parseFilterState(JSON.parse(raw), options.allowedSorts);
  } catch {
    return null;
  }
}

export function writeFilterState<Sort extends string>(
  storage: Pick<Storage, "setItem">,
  userId: string,
  surface: FilterSurface,
  state: StoredFilterState<Sort>
): void {
  try {
    storage.setItem(filterStorageKey(userId, surface), JSON.stringify(state));
  } catch {
    // Filters are a convenience; private-mode and quota failures stay non-blocking.
  }
}

export function clearFilterState(
  storage: Pick<Storage, "removeItem">,
  userId: string,
  surface: FilterSurface
): void {
  try {
    storage.removeItem(filterStorageKey(userId, surface));
  } catch {
    // Keep Clear usable even when browser storage is unavailable.
  }
}

export function emptyStoredFacetFilters(): StoredFacetFilters {
  return { muscleGroupIds: [], equipment: "", exerciseType: "", ownership: "" };
}

function parseFilterState<Sort extends string>(
  value: unknown,
  allowedSorts: readonly Sort[]
): StoredFilterState<Sort> | null {
  if (!isRecord(value) || !isRecord(value.filters) || typeof value.sort !== "string") return null;
  const filters = value.filters;
  if (!allowedSorts.includes(value.sort as Sort)) return null;
  if (!isStringArray(filters.muscleGroupIds)) return null;
  if (!isEquipment(filters.equipment) || !isExerciseType(filters.exerciseType)) return null;
  if (!isOwnership(filters.ownership)) return null;

  return {
    filters: {
      muscleGroupIds: [...new Set(filters.muscleGroupIds)],
      equipment: filters.equipment,
      exerciseType: filters.exerciseType,
      ownership: filters.ownership
    },
    sort: value.sort as Sort
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value)
    && value.every((item) => typeof item === "string" && UUID_PATTERN.test(item));
}

function isEquipment(value: unknown): value is string {
  return typeof value === "string" && EQUIPMENT_VALUES.includes(value);
}

function isExerciseType(value: unknown): value is string {
  return typeof value === "string" && EXERCISE_TYPE_VALUES.includes(value);
}

function isOwnership(value: unknown): value is StoredFacetFilters["ownership"] {
  return typeof value === "string" && OWNERSHIP_VALUES.includes(value);
}

const EQUIPMENT_VALUES = ["", "unspecified", "barbell", "dumbbell", "kettlebell", "cable", "machine", "plate-loaded machine", "Smith machine", "resistance band", "bodyweight", "other"];
const EXERCISE_TYPE_VALUES = ["", "unspecified", "compound", "isolation", "isometric", "other"];
const OWNERSHIP_VALUES = ["", "editable", "readOnly"];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
