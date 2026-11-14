"use client";

import "../bootstrap";
import { dehydrate, hydrate, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";

const CACHE_KEY = "gymtrack.app.query-cache.v1";
const MAX_CACHE_BYTES = 3_000_000;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const SAVE_DELAY_MS = 1_000;

function clearReadCache(): void {
  try {
    window.localStorage.removeItem(CACHE_KEY);
  } catch {
    // Nothing stored.
  }
}

function restore(client: QueryClient): void {
  try {
    const stored = JSON.parse(window.localStorage.getItem(CACHE_KEY) ?? "null") as { savedAt?: number; state?: unknown } | null;

    if (stored?.state && typeof stored.savedAt === "number" && Date.now() - stored.savedAt < MAX_AGE_MS) {
      hydrate(client, stored.state);
    }
  } catch {
    clearReadCache();
  }
}

function save(client: QueryClient): void {
  try {
    const state = dehydrate(client, { shouldDehydrateQuery: (query) => query.state.status === "success" });
    const serialized = JSON.stringify({ savedAt: Date.now(), state });

    if (serialized.length <= MAX_CACHE_BYTES) {
      window.localStorage.setItem(CACHE_KEY, serialized);
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
  const [client] = useState(() => {
    const created = new QueryClient({
      defaultOptions: {
        queries: { retry: 1, staleTime: 15_000, gcTime: MAX_AGE_MS, refetchOnWindowFocus: false },
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
    const unsubscribe = client.getQueryCache().subscribe(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => save(client), SAVE_DELAY_MS);
    });

    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [client]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
