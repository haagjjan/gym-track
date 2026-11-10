"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { backTarget, recordVisit, titleFor, type BackTarget } from "./navigation";

const STORAGE_KEY = "gymtrack.nav-history";

function readHistory(): string[] {
  try {
    const parsed: unknown = JSON.parse(globalThis.sessionStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

function writeHistory(history: string[]): void {
  try {
    globalThis.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Storage blocked: Back falls back to the route-table parent.
  }
}

/**
 * Mounted once in the root layout so every route change is recorded, including
 * the full-screen live workout that runs outside the app shell.
 */
export function NavigationTracker(): ReactNode {
  const pathname = usePathname();

  useEffect(() => {
    writeHistory(recordVisit(readHistory(), pathname));
  }, [pathname]);

  return null;
}

export interface AppBack {
  /** Title of the screen Back returns to, for the back control's label. */
  label: string;
  target: BackTarget;
  goBack: () => void;
}

/** Back control for pushed screens. A screen never picks its own target. */
export function useAppBack(signedIn = true): AppBack {
  const pathname = usePathname();
  const router = useRouter();
  const [history, setHistory] = useState<string[]>([]);

  // backTarget copes with the current path being in the list or not yet in it,
  // so the effect order against NavigationTracker doesn't matter.
  useEffect(() => {
    setHistory(readHistory());
  }, [pathname]);

  const target = backTarget(history, pathname, signedIn);

  const goBack = useCallback(() => {
    const current = backTarget(readHistory(), pathname, signedIn);
    if (current.kind === "history") router.back();
    else if (current.kind === "parent") router.replace(current.path);
  }, [pathname, router, signedIn]);

  return { label: target.kind === "none" ? "Back" : titleFor(target.path), target, goBack };
}
