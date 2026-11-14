"use client";

import "../bootstrap";
import { dehydrate, hydrate, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { setCatalogStorage } from "../../../web/src/shared/offline/exercise-catalog";
import { setOutboxStorage } from "../../../web/src/shared/offline/outbox-store";
import { deviceGet, deviceKey, deviceRemove, deviceSet, deviceStoreReady } from "./device-store";

const CACHE_KEY = "gymtrack.app.query-cache.v1";
const MAX_CACHE_BYTES = 3_000_000;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const SAVE_DELAY_MS = 1_000;
// In-memory lifetime of unused answers. Must stay below the 2^31 ms timer limit,
// or the timer fires at once and the restored cache is dropped.
const MEMORY_LIFETIME_MS = 24 * 60 * 60 * 1000;
/**
 * Query families kept on the device: what the logger, launcher, History and the
 * tab roots need to open. The full exercise search results are left out; they are
 * large and adding an exercise needs a connection anyway.
 */
const KEPT_QUERIES = new Set([
  "workouts",
  "workouts-infinite",
  "workout",
  "workout-templates",
  "workout-template",
  "exercise-options",
  "muscle-groups",
  "user-preferences",
  "completed-exercises",
  "weekly-volume"
]);

function clearReadCache(): void {
  try {
    deviceRemove(CACHE_KEY);
  } catch {
    // Nothing stored.
  }
}

function restore(client: QueryClient): void {
  try {
    const stored = JSON.parse(deviceGet(CACHE_KEY) ?? "null") as { savedAt?: number; state?: unknown } | null;

    if (stored?.state && typeof stored.savedAt === "number" && Date.now() - stored.savedAt < MAX_AGE_MS) {
      hydrate(client, stored.state);
    }
  } catch {
    clearReadCache();
  }
}

function save(client: QueryClient): void {
  try {
    // Keep every answer that has data, also when its latest refresh failed: an
    // offline start must not wipe what the last online run stored.
    const state = dehydrate(client, {
      shouldDehydrateQuery: (query) => query.state.data !== undefined && KEPT_QUERIES.has(String(query.queryKey[0]))
    });

    for (const query of state.queries) {
      query.state = { ...query.state, status: "success", error: null, fetchStatus: "idle", fetchFailureCount: 0, fetchFailureReason: null };
    }

    const serialized = JSON.stringify({ savedAt: Date.now(), state });

    if (serialized.length <= MAX_CACHE_BYTES) {
      deviceSet(CACHE_KEY, serialized);
    }
  } catch {
    // Storage full or blocked: the app still works online.
  }
}

/**
 * Query client for the phone app. It keeps the last successful answers on the
 * device so the active workout, the exercise list and templates open without a
 * network (ADR 0025, stage 1), and lets mutations run offline so the set outbox
 * can take over.
 */
export function AppQueryProvider({ children }: { children: ReactNode }): ReactNode {
  const [storeOpen, setStoreOpen] = useState(false);

  useEffect(() => {
    // Nothing reads or writes logged data before the device store is open.
    void deviceStoreReady().then(() => {
      setOutboxStorage(deviceKey("gymtrack.workout-outbox.v2"));
      setCatalogStorage(deviceKey("gymtrack.exercise-catalog.v1"));
      setStoreOpen(true);
    });
  }, []);

  return storeOpen ? <QueryCache>{children}</QueryCache> : null;
}

function QueryCache({ children }: { children: ReactNode }): ReactNode {
  const [client] = useState(() => {
    const created = new QueryClient({
      defaultOptions: {
        queries: { retry: 1, staleTime: 15_000, gcTime: MEMORY_LIFETIME_MS, refetchOnWindowFocus: false },
        mutations: { networkMode: "always" }
      }
    });

    if (typeof window !== "undefined") {
      restore(created);
    }

    return created;
  });

  useEffect(() => {
    let timer: number | undefined;
    // Throttled, not debounced: a busy cache must not postpone the save forever.
    const unsubscribe = client.getQueryCache().subscribe(() => {
      timer ??= window.setTimeout(() => {
        timer = undefined;
        save(client);
      }, SAVE_DELAY_MS);
    });
    const saveNow = (): void => {
      if (document.visibilityState === "hidden") save(client);
    };

    document.addEventListener("visibilitychange", saveNow);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", saveNow);
      unsubscribe();
    };
  }, [client]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
