"use client";

import { useFBX } from "@react-three/drei";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { createRadialGlowTexture } from "../avatar/hologram-bay";
import {
  AVATAR_MODEL_URL,
  boundsAboveHeight,
  RIM_CYAN,
  STATUE_HEIGHT
} from "../avatar/statue-core";
import {
  heatT,
  measureFigureFrame,
  regionIndexBySlug,
  REGION_SLUGS,
  type FigureFrame,
  type RegionSlug
} from "./heatmap";
import { createMuscleMaskMaterial } from "./muscle-mask-material";
import { getRegionMaps } from "./region-map";

export function VolumeMuscleBody({
  weeklySetsBySlug,
  heatCeiling,
  selectedSlug,
  onSelect,
  onFrame,
  debugRegions
}: {
  weeklySetsBySlug: Record<string, number>;
  heatCeiling: number;
  selectedSlug: string | null;
  onSelect: (slug: RegionSlug | null) => void;
  onFrame: (frame: FigureFrame) => void;
  debugRegions: boolean;
}): ReactNode {
  const fbx = useFBX(AVATAR_MODEL_URL);
  const invalidate = useThree((state) => state.invalidate);
  const regionMaps = useMemo(getRegionMaps, []);
  const mask = useMemo(
    () =>
      createMuscleMaskMaterial(
        regionMaps.frontTexture,
        regionMaps.backTexture,
        regionMaps.sideTexture
      ),
    [regionMaps]
  );
  const glowTexture = useMemo(createRadialGlowTexture, []);

  const { statue, frame } = useMemo(() => {
    const instance = cloneSkeleton(fbx);

    instance.scale.setScalar(1);
    instance.position.set(0, 0, 0);
    instance.updateMatrixWorld(true);

    const rawSize = new THREE.Box3().setFromObject(instance).getSize(new THREE.Vector3());

    instance.scale.setScalar(STATUE_HEIGHT / rawSize.y);
    instance.updateMatrixWorld(true);

    const scaledBox = new THREE.Box3().setFromObject(instance);
    const figureBounds = boundsAboveHeight(
      instance,
      scaledBox.min.y + (scaledBox.max.y - scaledBox.min.y) * 0.4
    );
    const figureCenter = figureBounds.getCenter(new THREE.Vector3());

    instance.position.set(-figureCenter.x, -scaledBox.min.y, -figureCenter.z);
    instance.updateMatrixWorld(true);
    instance.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = mask.material;
        child.frustumCulled = false;
      }
    });

    const nextFrame = measureFigureFrame(instance);

    mask.uniforms.uFeetY.value = nextFrame.feetY;
    mask.uniforms.uInvHeight.value = 1 / Math.max(nextFrame.headY - nextFrame.feetY, 1e-6);
    mask.uniforms.uInvHalf.value = 1 / Math.max(nextFrame.halfWidth, 1e-6);

    return { statue: instance, frame: nextFrame };
  }, [fbx, mask]);

  useEffect(() => {
    onFrame(frame);
  }, [frame, onFrame]);

  useEffect(() => {
    let active = true;

    void regionMaps.ready.then(() => {
      if (active) invalidate();
    });

    return () => {
      active = false;
    };
  }, [regionMaps, invalidate]);

  useEffect(() => {
    mask.setMode(debugRegions ? "debug" : "holo");
    const heat = mask.uniforms.uHeat.value;

    heat.fill(0);
    for (const [slug, weeklySets] of Object.entries(weeklySetsBySlug)) {
      const regionIndex = regionIndexBySlug.get(slug);
      if (regionIndex !== undefined && regionIndex > 0) {
        heat[regionIndex] = heatT(weeklySets, heatCeiling);
      }
    }

    mask.uniforms.uSelected.value = selectedSlug ? regionIndexBySlug.get(selectedSlug) ?? 0 : 0;
    invalidate();
  }, [debugRegions, heatCeiling, invalidate, mask, selectedSlug, weeklySetsBySlug]);

  function handleClick(event: ThreeEvent<MouseEvent>): void {
    if (event.delta > 6 || !(event.object instanceof THREE.Mesh)) return;
    const localNormal = event.normal ?? event.face?.normal;
    if (!localNormal) return;

    event.stopPropagation();
    const normal = localNormal.clone().transformDirection(event.object.matrixWorld);
    const xn = event.point.x / frame.halfWidth;
    const yn = (event.point.y - frame.feetY) / (frame.headY - frame.feetY);
    const zn = event.point.z / frame.halfWidth;
    const region = regionMaps.getRegionAt({ xn, zn, yn, nx: normal.x, nz: normal.z });

    if (region > 0) onSelect(REGION_SLUGS[region] ?? null);
  }

  return (
    <group>
      <primitive object={statue} onClick={handleClick} />
      <mesh position={[0, frame.feetY + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.95, 48]} />
        <meshBasicMaterial
          blending={THREE.AdditiveBlending}
          color={RIM_CYAN}
          depthWrite={false}
          map={glowTexture}
          opacity={0.4}
          toneMapped={false}
          transparent
        />
      </mesh>
    </group>
  );
}
