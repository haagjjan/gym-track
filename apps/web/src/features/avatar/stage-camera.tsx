"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, type ReactNode } from "react";
import * as THREE from "three";

/** Ambient render cap — display refresh (120Hz+) buys nothing here but heat. */
const MAX_FPS = 30;
export const BASE_CAMERA_HEIGHT = 1.5;
export const BASE_CAMERA_Z = 3.65;
/** Pull-back ceiling: beyond this the figure drowns in the bay fog (starts at 9). */
const MAX_CAMERA_Z = 6.5;
const LOOK_TARGET = new THREE.Vector3(0, 1.25, 0);
/** World half-width (arms included) that must stay in frame at any aspect. */
const FRAME_HALF_WIDTH = 0.62;

/**
 * Aspect-aware framing: the base distance is tuned for the wide desktop
 * container, but at narrow aspects (mid-size viewports squeeze the center
 * column) a fixed camera crops the arms — pull back until the figure's width
 * fits the horizontal fov. Idempotent; called from the rig and before any
 * screen-edge math so both always agree on the projection.
 */
export function fitStageCamera(camera: THREE.Camera, aspect: number): void {
  if (!(camera instanceof THREE.PerspectiveCamera)) {
    return;
  }

  const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const distanceForWidth = FRAME_HALF_WIDTH / Math.max(tanHalfFov * aspect, 1e-6);
  const distance = Math.min(MAX_CAMERA_Z, Math.max(BASE_CAMERA_Z, distanceForWidth));

  camera.position.set(0, BASE_CAMERA_HEIGHT, distance);
  camera.lookAt(LOOK_TARGET);
  camera.updateMatrixWorld(true);
}

/** Re-fits the fixed camera whenever the canvas aspect changes. */
export function CameraRig(): ReactNode {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);

  useEffect(() => {
    fitStageCamera(camera, size.width / Math.max(size.height, 1));
  }, [camera, size]);

  return null;
}

/**
 * Drives the demand frameloop at a capped cadence: the browser's rAF runs at
 * display refresh (120Hz+ on ProMotion), but a frame is only invalidated when
 * enough time has passed — everything above MAX_FPS is skipped compute.
 */
export function FrameRateCap({ active }: { active: boolean }): ReactNode {
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    if (!active) {
      return;
    }

    const minFrameMs = 1000 / MAX_FPS;
    let raf = 0;
    let last = 0;

    const loop = (time: number): void => {
      raf = requestAnimationFrame(loop);

      // Half-frame tolerance so 120Hz ticks land on every second frame
      // instead of drifting to ~40fps.
      if (time - last >= minFrameMs - 4) {
        last = time;
        invalidate();
      }
    };

    raf = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(raf);
  }, [active, invalidate]);

  return null;
}
