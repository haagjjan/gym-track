"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode, type RefObject } from "react";
import * as THREE from "three";
import type { StageState } from "./stage-driver";
import { PULSE_GREEN } from "./statue-core";

const PARTICLE_COUNT = 140;
const BURST_ORIGIN = new THREE.Vector3(0, 1.25, 0);

/** PR celebration: green particle burst driven by `StageState.burstProgress`. */
export function PrBurst({ stateRef }: { stateRef: RefObject<StageState> }): ReactNode {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const positions = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);
  const seeds = useMemo(() => {
    const directions = new Float32Array(PARTICLE_COUNT * 3);
    const speeds = new Float32Array(PARTICLE_COUNT);

    for (let index = 0; index < PARTICLE_COUNT; index += 1) {
      const theta = Math.random() * Math.PI * 2;
      const up = Math.random() * 0.9 + 0.15;
      const radial = Math.sqrt(Math.max(0, 1 - up * up));

      directions[index * 3] = Math.cos(theta) * radial;
      directions[index * 3 + 1] = up;
      directions[index * 3 + 2] = Math.sin(theta) * radial;
      speeds[index] = 1.2 + Math.random() * 1.6;
    }

    return { directions, speeds };
  }, []);

  useFrame(() => {
    const points = pointsRef.current;
    const material = materialRef.current;

    if (!points || !material) {
      return;
    }

    const progress = stateRef.current.burstProgress;

    if (progress >= 1) {
      points.visible = false;
      return;
    }

    points.visible = true;

    const eased = 1 - Math.pow(1 - progress, 2.2);
    const attribute = points.geometry.getAttribute("position") as THREE.BufferAttribute;

    for (let index = 0; index < PARTICLE_COUNT; index += 1) {
      const distance = (seeds.speeds[index] ?? 0) * eased;
      const directionX = seeds.directions[index * 3] ?? 0;
      const directionY = seeds.directions[index * 3 + 1] ?? 0;
      const directionZ = seeds.directions[index * 3 + 2] ?? 0;

      attribute.setXYZ(
        index,
        BURST_ORIGIN.x + directionX * distance,
        BURST_ORIGIN.y + directionY * distance * 1.15 - 0.35 * eased * eased,
        BURST_ORIGIN.z + directionZ * distance
      );
    }

    attribute.needsUpdate = true;
    material.opacity = (1 - progress) * 0.95;
  });

  return (
    <points ref={pointsRef} visible={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        blending={THREE.AdditiveBlending}
        color={PULSE_GREEN}
        depthWrite={false}
        opacity={0}
        ref={materialRef}
        size={0.05}
        sizeAttenuation
        toneMapped={false}
        transparent
      />
    </points>
  );
}
