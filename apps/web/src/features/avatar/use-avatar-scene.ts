"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

export type AvatarSceneSupport = "checking" | "ready" | "unavailable";

/**
 * Shared avatar scene-state checks, reused from the legacy Home avatar visual
 * (doc 09's "Home avatar state": static fallback + reduced-motion handling) and
 * the Phase 1 spike's `canUseWebGl` gate — not a new parallel mechanism.
 *
 * - `support` gates rendering: "unavailable" means show a static fallback.
 * - `reducedMotion` tracks `prefers-reduced-motion` live (freezes turntable,
 *   bay pulse, and motes; the scene then renders on demand only).
 */
export function useAvatarSceneSupport(): {
  support: AvatarSceneSupport;
  reducedMotion: boolean;
} {
  const [support, setSupport] = useState<AvatarSceneSupport>("checking");
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setSupport(canUseWebGl() ? "ready" : "unavailable");

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = (): void => setReducedMotion(query.matches);

    update();
    query.addEventListener("change", update);

    return () => query.removeEventListener("change", update);
  }, []);

  return { support, reducedMotion };
}

/**
 * Frame-loop governance ported from the legacy scene's IntersectionObserver +
 * reduced-motion pausing, adapted to R3F's `frameloop` prop:
 *
 * - visible + motion allowed → "always" (continuous ambient loop)
 * - scrolled offscreen or reduced motion → "demand" (renders only when something
 *   invalidates: orbit interaction, resize, data repaints — otherwise 0 GPU work)
 *
 * Tab-hidden pausing needs no handling here: R3F drives rendering with
 * requestAnimationFrame, which the browser already suspends for hidden tabs.
 */
export function useFrameloopGovernor(reducedMotion: boolean): {
  hostRef: RefObject<HTMLDivElement | null>;
  frameloop: "always" | "demand";
} {
  const hostRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const host = hostRef.current;

    if (!host) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry?.isIntersecting ?? true),
      { threshold: 0.05 }
    );

    observer.observe(host);

    return () => observer.disconnect();
  }, []);

  return { hostRef, frameloop: reducedMotion || !inView ? "demand" : "always" };
}

function canUseWebGl(): boolean {
  try {
    const canvas = document.createElement("canvas");

    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}
