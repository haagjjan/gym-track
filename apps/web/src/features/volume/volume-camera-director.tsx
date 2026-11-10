"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import * as THREE from "three";
import { FRONT_AZIMUTH, type FigureFrame } from "./heatmap";
import { muscleGroupOf } from "./muscle-regions";

export const ORBIT_TARGET = new THREE.Vector3(0, 1.27, 0);
// Fills the shorter phone stage: feet near the bottom edge, crown near the top.
export const DEFAULT_RADIUS = 2.9;
const FOCUS_RADIUS = 2.1;
const FOCUS_DAMP = 3;

/** Where the camera looks for a muscle group, and for the regions that sit apart from their group. */
const REGION_FOCUS: Record<string, { yn: number; side: "front" | "back" }> = {
  chest: { yn: 0.75, side: "front" },
  back: { yn: 0.68, side: "back" },
  traps: { yn: 0.83, side: "back" },
  shoulders: { yn: 0.8, side: "front" },
  biceps: { yn: 0.83, side: "front" },
  triceps: { yn: 0.77, side: "back" },
  forearms: { yn: 0.85, side: "front" },
  abs: { yn: 0.64, side: "front" },
  glutes: { yn: 0.52, side: "back" },
  quads: { yn: 0.46, side: "front" },
  hamstrings: { yn: 0.4, side: "back" },
  calves: { yn: 0.23, side: "back" },
  delts_rear: { yn: 0.82, side: "back" },
  lats: { yn: 0.68, side: "back" },
  upper_back: { yn: 0.76, side: "back" },
  lower_back: { yn: 0.58, side: "back" },
  neck: { yn: 0.88, side: "front" },
  obliques: { yn: 0.62, side: "front" },
  abductors: { yn: 0.55, side: "back" },
  adductors: { yn: 0.45, side: "front" }
};

export interface OrbitControlsLike {
  enabled: boolean;
  getAzimuthalAngle: () => number;
  setAzimuthalAngle: (angle: number) => void;
  target: THREE.Vector3;
  update: () => void;
}

export function CameraDirector({
  controlsRef,
  frame,
  reducedMotion,
  selectedSlug,
  viewRef,
  userOrbitRef
}: {
  controlsRef: RefObject<OrbitControlsLike | null>;
  frame: FigureFrame | null;
  reducedMotion: boolean;
  selectedSlug: string | null;
  viewRef: RefObject<((azimuth: number) => void) | null>;
  userOrbitRef: RefObject<boolean>;
}): ReactNode {
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const goalRef = useRef<{ targetY: number; radius: number; theta: number | null } | null>(null);

  useEffect(() => {
    const focus = selectedSlug ? REGION_FOCUS[selectedSlug] ?? REGION_FOCUS[muscleGroupOf(selectedSlug)] : undefined;
    goalRef.current = focus && frame
      ? {
          targetY: frame.feetY + focus.yn * (frame.headY - frame.feetY),
          radius: FOCUS_RADIUS,
          theta: focus.side === "front" ? FRONT_AZIMUTH : FRONT_AZIMUTH + Math.PI
        }
      : { targetY: ORBIT_TARGET.y, radius: DEFAULT_RADIUS, theta: null };
    invalidate();
  }, [frame, invalidate, selectedSlug]);

  useEffect(() => {
    viewRef.current = (azimuth: number) => {
      const target = controlsRef.current?.target ?? ORBIT_TARGET;
      const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(target));
      userOrbitRef.current = false;
      goalRef.current = { targetY: target.y, radius: spherical.radius, theta: azimuth };
      invalidate();
    };
    return () => {
      viewRef.current = null;
    };
  }, [camera, controlsRef, invalidate, userOrbitRef, viewRef]);

  useFrame((_, delta) => {
    if (userOrbitRef.current) {
      userOrbitRef.current = false;
      goalRef.current = null;
    }
    const goal = goalRef.current;
    const controls = controlsRef.current;
    if (!goal || !controls) return;

    const target = controls.target;
    const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(target));
    const thetaDiff = goal.theta === null ? 0 : angleDelta(spherical.theta, goal.theta);
    if (reducedMotion) {
      target.y = goal.targetY;
      spherical.radius = goal.radius;
      spherical.theta += thetaDiff;
    } else {
      const step = 1 - Math.exp(-FOCUS_DAMP * delta);
      target.y = THREE.MathUtils.damp(target.y, goal.targetY, FOCUS_DAMP, delta);
      spherical.radius = THREE.MathUtils.damp(spherical.radius, goal.radius, FOCUS_DAMP, delta);
      spherical.theta += thetaDiff * step;
    }
    camera.position.copy(target).add(new THREE.Vector3().setFromSpherical(spherical));
    camera.lookAt(target);

    const settled =
      Math.abs(target.y - goal.targetY) < 0.002 &&
      Math.abs(spherical.radius - goal.radius) < 0.002 &&
      (goal.theta === null || Math.abs(angleDelta(spherical.theta, goal.theta)) < 0.002);
    if (settled) goalRef.current = null;
    invalidate();
  });

  return null;
}

function angleDelta(from: number, to: number): number {
  const tau = Math.PI * 2;
  let diff = (to - from) % tau;
  if (diff > Math.PI) diff -= tau;
  else if (diff < -Math.PI) diff += tau;
  return diff;
}
