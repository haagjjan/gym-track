"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { RIM_CYAN } from "./statue-core";

const MOTE_COUNT = 90;
const MOTE_FIELD_RADIUS = 5.5;
const MOTE_FIELD_HEIGHT = 6.5;

/** Slow drifting motes: the only continuous, non-interactive ambient loop. */
export function BayMotes({ reducedMotion }: { reducedMotion: boolean }): ReactNode {
  const motesRef = useRef<THREE.Points>(null);
  const motes = useMemo(() => {
    const positions = new Float32Array(MOTE_COUNT * 3);
    const speeds = new Float32Array(MOTE_COUNT);

    for (let index = 0; index < MOTE_COUNT; index += 1) {
      const radius = Math.sqrt(Math.random()) * MOTE_FIELD_RADIUS;
      const theta = Math.random() * Math.PI * 2;

      positions[index * 3] = Math.cos(theta) * radius;
      positions[index * 3 + 1] = Math.random() * MOTE_FIELD_HEIGHT;
      positions[index * 3 + 2] = Math.sin(theta) * radius;
      speeds[index] = 0.05 + Math.random() * 0.12;
    }

    return { positions, speeds };
  }, []);

  useFrame((_, delta) => {
    if (reducedMotion) {
      return;
    }

    const points = motesRef.current;

    if (points) {
      const attribute = points.geometry.getAttribute("position") as THREE.BufferAttribute;

      for (let index = 0; index < MOTE_COUNT; index += 1) {
        let y = (attribute.getY(index) ?? 0) + (motes.speeds[index] ?? 0) * delta;

        if (y > MOTE_FIELD_HEIGHT) {
          y -= MOTE_FIELD_HEIGHT;
        }

        attribute.setY(index, y);
      }

      attribute.needsUpdate = true;
    }
  });

  return (
    <points ref={motesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[motes.positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        blending={THREE.AdditiveBlending}
        color={RIM_CYAN}
        depthWrite={false}
        opacity={0.5}
        size={0.045}
        sizeAttenuation
        toneMapped={false}
        transparent
      />
    </points>
  );
}
