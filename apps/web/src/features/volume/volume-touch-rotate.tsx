"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import type { OrbitControlsLike } from "./volume-camera-director";

/** Native vertical scrolling owns momentum and cancellation; only sideways drags rotate. */
export function TouchRotate({ controlsRef, onStart }: {
  controlsRef: RefObject<OrbitControlsLike | null>;
  onStart: () => void;
}): ReactNode {
  const canvas = useThree((state) => state.gl.domElement);
  const invalidate = useThree((state) => state.invalidate);
  const onStartRef = useRef(onStart);
  onStartRef.current = onStart;

  useEffect(() => {
    // OrbitControls writes "none" even while disabled. Restore the browser's
    // vertical pan after its mount, so a swipe has exactly one scroll owner.
    canvas.style.touchAction = "pan-y";
    let gesture: { pointerId: number; x: number; y: number; azimuth: number; rotating: boolean } | null = null;
    const down = (event: PointerEvent): void => {
      if (event.pointerType !== "touch" || !event.isPrimary) return;
      gesture = { pointerId: event.pointerId, x: event.clientX, y: event.clientY,
        azimuth: controlsRef.current?.getAzimuthalAngle() ?? 0, rotating: false };
    };
    const move = (event: PointerEvent): void => {
      const controls = controlsRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId || !controls) return;
      const dx = event.clientX - gesture.x;
      const dy = event.clientY - gesture.y;
      if (!gesture.rotating) {
        if (Math.hypot(dx, dy) < 8) return;
        if (Math.abs(dy) >= Math.abs(dx)) { gesture = null; return; }
        gesture.rotating = true;
        onStartRef.current();
      }
      controls.setAzimuthalAngle(gesture.azimuth - dx / Math.max(canvas.clientWidth, 1) * Math.PI);
      controls.update();
      invalidate();
    };
    const end = (event: PointerEvent): void => {
      if (gesture?.pointerId === event.pointerId) gesture = null;
    };
    canvas.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [canvas, controlsRef, invalidate]);
  return null;
}
