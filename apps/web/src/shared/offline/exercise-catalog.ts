import { apiFetch } from "../api/client";
import type { Exercise } from "../api/types";

/**
 * A copy of the whole exercise list on the phone, so exercises can be searched
 * and added to a workout without a connection (ADR 0025).
 */
export interface CatalogFilters {
  search?: string;
  muscleGroupIds?: string[];
  equipment?: string;
  exerciseType?: string;
  ownership?: string;
  trackingMode?: string;
  sort?: string;
}

export interface CatalogStorage {
  read(): string | null;
  write(value: string): void;
}

const STORAGE_KEY = "gymtrack.exercise-catalog.v1";
const PAGE_SIZE = 100;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

const browserStorage: CatalogStorage = {
  read() {
    try {
      return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  },
  write(value) {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, value);
    } catch {
      // No room: adding exercises then needs a connection.
    }
  }
};

let storage: CatalogStorage = browserStorage;
let cached: { raw: string | null; items: Exercise[] | null; savedAt: number } | null = null;

export function setCatalogStorage(next: CatalogStorage): void {
  storage = next;
  cached = null;
}

function load(): { items: Exercise[] | null; savedAt: number } {
  const raw = storage.read();

  if (cached?.raw === raw) return cached;

  try {
    const parsed = JSON.parse(raw ?? "null") as { items?: Exercise[]; savedAt?: number } | null;
    cached = { raw, items: Array.isArray(parsed?.items) ? parsed.items : null, savedAt: parsed?.savedAt ?? 0 };
  } catch {
    cached = { raw, items: null, savedAt: 0 };
  }

  return cached;
}

export function readCatalog(): Exercise[] | null {
  return load().items;
}

/** Downloads the full list when the copy is missing or older than a day. */
export async function refreshCatalog(now = Date.now()): Promise<void> {
  if (now - load().savedAt < MAX_AGE_MS) return;

  const items: Exercise[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await apiFetch<{ items: Exercise[]; pagination: { total: number } }>(`/api/exercises?limit=${PAGE_SIZE}&offset=${offset}`);
    items.push(...page.items);

    if (page.items.length === 0 || items.length >= page.pagination.total) break;
  }

  storage.write(JSON.stringify({ savedAt: now, items }));
}

function matchesMode(exercise: Exercise, mode: string | undefined): boolean {
  const own = exercise.trackingMode ?? "reps";

  if (!mode) return true;
  return mode === "strength" ? own !== "cardio" : own === mode;
}

/** The same filters the API applies, on the phone's copy. */
export function filterCatalog(items: readonly Exercise[], filters: CatalogFilters, userId: string | null = null): Exercise[] {
  const search = filters.search?.trim().toLowerCase() ?? "";
  const muscles = new Set(filters.muscleGroupIds ?? []);
  const field = (value: string | null, wanted: string | undefined): boolean =>
    !wanted || (wanted === "unspecified" ? value === null : value === wanted);
  const muscleName = (exercise: Exercise): string => exercise.primaryMuscleGroup?.name ?? "";
  const key = (exercise: Exercise): string =>
    filters.sort === "muscle" ? muscleName(exercise)
      : filters.sort === "equipment" ? exercise.equipment ?? "~"
        : filters.sort === "type" ? exercise.exerciseType ?? "~"
          : "";

  return items
    .filter((exercise) => !search || exercise.name.toLowerCase().includes(search) || exercise.muscleGroups.some((muscle) => muscle.name.toLowerCase().includes(search)))
    .filter((exercise) => muscles.size === 0 || exercise.muscleGroups.some((muscle) => muscles.has(muscle.id)))
    .filter((exercise) => field(exercise.equipment, filters.equipment) && field(exercise.exerciseType, filters.exerciseType))
    .filter((exercise) => matchesMode(exercise, filters.trackingMode))
    .filter((exercise) => !filters.ownership || (filters.ownership === "editable") === (exercise.createdByUserId !== null && exercise.createdByUserId === userId))
    .sort((left, right) => key(left).localeCompare(key(right)) || left.name.localeCompare(right.name));
}
