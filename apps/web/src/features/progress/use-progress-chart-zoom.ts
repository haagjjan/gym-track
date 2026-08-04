"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { ChartWindow } from "./progress-selection";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;

export interface ProgressChartZoom {
  gestureActive: boolean;
  reducedMotion: boolean;
  reset: () => void;
  scrollerRef: RefObject<HTMLDivElement | null>;
  zoom: number;
}

export function useProgressChartZoom(windowKey: ChartWindow): ProgressChartZoom {
  const [zoom, setZoom] = useState(1);
  const [gestureActive, setGestureActive] = useState(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef(1);
  const pendingAnchorRef = useRef<{ contentX: number; prevWidth: number; viewportX: number } | null>(null);
  const wheelTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | undefined>(undefined);
  const reducedMotion = useMemo(() => typeof globalThis.matchMedia === "function" && globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  zoomRef.current = zoom;

  useEffect(() => setZoom(1), [windowKey]);
  useLayoutEffect(() => {
    const element = scrollerRef.current;
    const anchor = pendingAnchorRef.current;
    if (!element || !anchor) return;
    pendingAnchorRef.current = null;
    const scale = element.scrollWidth / Math.max(anchor.prevWidth, 1);
    element.scrollLeft = anchor.contentX * scale - anchor.viewportX - (element.scrollWidth - element.clientWidth);
  }, [zoom]);

  useEffect(() => {
    const element = scrollerRef.current;
    if (!element) return;

    const applyZoom = (factor: number, clientX: number): void => {
      const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoomRef.current * factor));
      if (next === zoomRef.current) return;
      zoomRef.current = next;
      const viewportX = clientX - element.getBoundingClientRect().left;
      pendingAnchorRef.current = {
        contentX: element.scrollLeft + element.scrollWidth - element.clientWidth + viewportX,
        prevWidth: element.scrollWidth,
        viewportX
      };
      setZoom(next);
    };

    const onWheel = (event: WheelEvent): void => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setGestureActive(true);
      globalThis.clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = globalThis.setTimeout(() => setGestureActive(false), 250);
      applyZoom(Math.exp(-event.deltaY * 0.002), event.clientX);
    };

    let pinchDistance = 0;
    const onTouchStart = (event: TouchEvent): void => {
      if (event.touches.length !== 2) return;
      pinchDistance = distanceBetween(event.touches[0]!, event.touches[1]!);
      setGestureActive(true);
    };
    const onTouchMove = (event: TouchEvent): void => {
      if (event.touches.length !== 2 || pinchDistance === 0) return;
      event.preventDefault();
      const distance = distanceBetween(event.touches[0]!, event.touches[1]!);
      applyZoom(distance / pinchDistance, (event.touches[0]!.clientX + event.touches[1]!.clientX) / 2);
      pinchDistance = distance;
    };
    const onTouchEnd = (event: TouchEvent): void => {
      if (event.touches.length >= 2 || pinchDistance === 0) return;
      pinchDistance = 0;
      setGestureActive(false);
    };

    element.addEventListener("wheel", onWheel, { passive: false });
    element.addEventListener("touchstart", onTouchStart, { passive: true });
    element.addEventListener("touchmove", onTouchMove, { passive: false });
    element.addEventListener("touchend", onTouchEnd, { passive: true });
    element.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      globalThis.clearTimeout(wheelTimerRef.current);
      element.removeEventListener("wheel", onWheel);
      element.removeEventListener("touchstart", onTouchStart);
      element.removeEventListener("touchmove", onTouchMove);
      element.removeEventListener("touchend", onTouchEnd);
      element.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  return { gestureActive, reducedMotion, reset: () => setZoom(1), scrollerRef, zoom };
}

function distanceBetween(left: Touch, right: Touch): number {
  return Math.hypot(left.clientX - right.clientX, left.clientY - right.clientY);
}
