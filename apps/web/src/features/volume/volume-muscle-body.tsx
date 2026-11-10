"use client";

import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { useBodyModel, type BodyPartKind } from "../avatar/body-model";
import { createRadialGlowTexture } from "../avatar/bay-textures";
import { RIM_CYAN } from "../avatar/statue-core";
import { HEAT_STAGE_COLORS, heatBucket, type FigureFrame, type RegionSlug } from "./heatmap";
import { MUSCLE_REGIONS, muscleGroupOf, regionMatches, weeklySetsForRegion } from "./muscle-regions";

/** Resting colours per theme: a quiet body so only trained muscles carry colour. */
const BODY_COLORS: Record<"dark" | "light", Record<BodyPartKind, string>> = {
  dark: { muscle: "#56616f", other: "#3b444f", bone: "#69727e", skin: "#434c58" },
  light: { muscle: "#e3e8ee", other: "#cfd6de", bone: "#f1f3f6", skin: "#d9dfe6" }
};
const DEBUG_HUES = MUSCLE_REGIONS.map((_, index) => new THREE.Color().setHSL((index * 0.381966) % 1, 0.7, 0.55));

/**
 * The muscle-volume figure. Every region is its own mesh with its own
 * material, so a region's heat or selection colours exactly that muscle and
 * nothing around it, and a tap picks the mesh that was hit.
 */
export function VolumeMuscleBody({
  weeklySetsBySlug,
  heatCeiling,
  selectedSlug,
  onSelect,
  onFrame,
  debugRegions,
  theme
}: {
  weeklySetsBySlug: Record<string, number>;
  heatCeiling: number;
  selectedSlug: string | null;
  onSelect: (slug: RegionSlug | null) => void;
  onFrame: (frame: FigureFrame) => void;
  debugRegions: boolean;
  theme: "dark" | "light";
}): ReactNode {
  const body = useBodyModel();
  const invalidate = useThree((state) => state.invalidate);
  const glowTexture = useMemo(createRadialGlowTexture, []);

  // One material per region (shared by its left and right mesh) and per neutral part.
  const materials = useMemo(() => {
    const byKey = new Map<string, THREE.MeshStandardMaterial>();

    for (const part of body.parts) {
      const key = part.slug ?? part.kind;
      let material = byKey.get(key);
      if (!material) {
        material = new THREE.MeshStandardMaterial({ metalness: 0, roughness: part.kind === "muscle" ? 0.62 : 0.8 });
        byKey.set(key, material);
      }
      part.mesh.material = material;
      part.mesh.userData.regionSlug = part.slug;
    }

    return byKey;
  }, [body]);

  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials]);

  useEffect(() => {
    onFrame(body.frame);
  }, [body, onFrame]);

  useEffect(() => {
    const rest = BODY_COLORS[theme];

    for (const kind of ["other", "bone", "skin"] as const) materials.get(kind)?.color.set(rest[kind]);

    MUSCLE_REGIONS.forEach((region, index) => {
      const material = materials.get(region.slug);
      if (!material) return;

      const bucket = heatBucket(weeklySetsForRegion(weeklySetsBySlug, region.slug), heatCeiling);
      const selected = regionMatches(selectedSlug, region.slug);

      if (debugRegions) {
        material.color.copy(DEBUG_HUES[index]!);
        material.emissive.set("#000000");
      } else if (bucket > 0) {
        material.color.set(HEAT_STAGE_COLORS[bucket - 1]!);
        material.emissive.set(HEAT_STAGE_COLORS[bucket - 1]!);
        material.emissiveIntensity = selected ? 0.55 : 0.22;
      } else {
        material.color.set(rest.muscle);
        material.emissive.set(selected ? RIM_CYAN : "#000000");
        material.emissiveIntensity = selected ? 0.35 : 0;
      }
    });

    invalidate();
  }, [debugRegions, heatCeiling, invalidate, materials, selectedSlug, theme, weeklySetsBySlug]);

  function handleClick(event: ThreeEvent<MouseEvent>): void {
    if (event.delta > 6) return;
    event.stopPropagation();

    const region = event.object.userData.regionSlug as string | null | undefined;
    if (!region) return;
    // Until the data carries region numbers, a tap selects the whole group.
    onSelect((region in weeklySetsBySlug ? region : muscleGroupOf(region)) as RegionSlug);
  }

  return (
    <group>
      <primitive object={body.root} onClick={handleClick} />
      <mesh position={[0, body.frame.feetY + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.95, 48]} />
        <meshBasicMaterial
          blending={THREE.AdditiveBlending}
          color={RIM_CYAN}
          depthWrite={false}
          map={glowTexture}
          opacity={theme === "dark" ? 0.4 : 0}
          toneMapped={false}
          transparent
        />
      </mesh>
    </group>
  );
}
