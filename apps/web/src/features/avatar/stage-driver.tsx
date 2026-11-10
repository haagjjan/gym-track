"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, type ReactNode, type RefObject } from "react";
import * as THREE from "three";
import { PULSE_GREEN, RIM_CYAN, type RimUniforms } from "./statue-core";

/** Baseline turntable speed (rad/s) the figure returns to after a drag. */
export const IDLE_SPIN_SPEED = 0.16;
/** Drag sensitivity: radians of figure yaw per pixel of pointer travel. */
const DRAG_SPIN_SPEED = 0.007;

export interface StageState {
  readiness: number;
  pulse: number;
  burstProgress: number;
}

export interface SpinState {
  dragging: boolean;
  /** Figure yaw accumulated from pointer moves since the last frame. */
  pendingDelta: number;
  /** Current angular velocity (rad/s) — carries drag inertia. */
  velocity: number;
}

/** Raw pointer listeners on the canvas that feed the turntable spin state. */
export function TurntableDrag({ spinRef }: { spinRef: RefObject<SpinState> }): ReactNode {
  const gl = useThree((state) => state.gl);

  useEffect(() => {
    const element = gl.domElement;
    let pointerId: number | null = null;
    let lastX = 0;

    // Keep horizontal figure dragging while allowing the dashboard to scroll
    // naturally under a vertical thumb swipe on touch screens.
    element.style.touchAction = "pan-y";
    element.style.cursor = "grab";

    const onDown = (event: PointerEvent): void => {
      if (pointerId !== null) {
        return;
      }

      pointerId = event.pointerId;
      lastX = event.clientX;
      spinRef.current.dragging = true;
      spinRef.current.pendingDelta = 0;

      // Capture can throw if the pointer vanished between dispatch and here.
      try {
        element.setPointerCapture(event.pointerId);
      } catch {
        // Uncaptured drags still work while the pointer stays over the canvas.
      }

      element.style.cursor = "grabbing";
    };

    const onMove = (event: PointerEvent): void => {
      if (event.pointerId !== pointerId) {
        return;
      }

      // Drag right → figure turns right (positive yaw), like spinning a globe.
      spinRef.current.pendingDelta += (event.clientX - lastX) * DRAG_SPIN_SPEED;
      lastX = event.clientX;
    };

    const onUp = (event: PointerEvent): void => {
      if (event.pointerId !== pointerId) {
        return;
      }

      pointerId = null;
      spinRef.current.dragging = false;
      element.style.cursor = "grab";
    };

    element.addEventListener("pointerdown", onDown);
    element.addEventListener("pointermove", onMove);
    element.addEventListener("pointerup", onUp);
    element.addEventListener("pointercancel", onUp);

    return () => {
      element.removeEventListener("pointerdown", onDown);
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerup", onUp);
      element.removeEventListener("pointercancel", onUp);
      element.style.cursor = "";
      element.style.touchAction = "";
    };
  }, [gl, spinRef]);

  return null;
}

export function StageDriver({
  autoSpin,
  reducedMotion,
  ringMaterial,
  spinRef,
  stateRef,
  turntable,
  uniforms
}: {
  autoSpin: boolean;
  reducedMotion: boolean;
  ringMaterial: THREE.MeshBasicMaterial;
  spinRef: RefObject<SpinState>;
  stateRef: RefObject<StageState>;
  turntable: RefObject<THREE.Group | null>;
  uniforms: RimUniforms;
}): ReactNode {
  const ringCyan = useMemo(() => new THREE.Color(RIM_CYAN), []);
  const ringGreen = useMemo(() => new THREE.Color(PULSE_GREEN), []);

  useFrame((_, delta) => {
    const state = stateRef.current;

    state.pulse = Math.max(0, state.pulse - delta / 3);
    state.burstProgress = Math.min(1, state.burstProgress + delta / 2.2);

    const readiness = Math.min(100, Math.max(0, state.readiness)) / 100;

    uniforms.uRimIntensity.value = 0.25 + readiness * 1.25 + state.pulse * 0.6;
    uniforms.uPulse.value = state.pulse;
    ringMaterial.color.copy(ringCyan).lerp(ringGreen, state.pulse);
    ringMaterial.opacity = 0.12 + readiness * 0.3 + state.pulse * 0.3;

    const spin = spinRef.current;

    if (!turntable.current) {
      return;
    }

    if (spin.dragging) {
      // Follow the pointer 1:1 and remember the speed for release inertia.
      turntable.current.rotation.y += spin.pendingDelta;
      spin.velocity = delta > 0 ? spin.pendingDelta / delta : spin.velocity;
      spin.pendingDelta = 0;
    } else {
      // Inertia decays back to the idle turntable — or to rest when the user
      // disabled auto-spin (Settings) or prefers reduced motion.
      const idleSpeed = reducedMotion || !autoSpin ? 0 : IDLE_SPIN_SPEED;

      spin.velocity = THREE.MathUtils.damp(spin.velocity, idleSpeed, 2.2, delta);
      turntable.current.rotation.y += spin.velocity * delta;
    }
  });

  return null;
}
