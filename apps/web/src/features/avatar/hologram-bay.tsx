"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { createBayEnvironment, ENVIRONMENT_SIZE, ENVIRONMENT_SIZE_SOFTWARE } from "./bay-environment";
import { BayMotes } from "./bay-motes";
import {
  createFloorTextures,
  createRadialGlowTexture,
  createVerticalGradientTexture
} from "./bay-textures";
import {
  BayPedestal,
  PEDESTAL_BASE_Y,
  PEDESTAL_RADIUS,
  PEDESTAL_TOP_Y
} from "./pedestal";
import { RIM_CYAN } from "./statue-core";

/**
 * Shared procedural "hologram bay" the avatar stands inside. Built from
 * primitives, generated canvas textures, fog, and emissive accents — the only
 * external mesh is the pedestal (BayPedestal / base-v-2.fbx).
 *
 * Ground rules from docs/14 Batch C Part 1 (incl. the REWORK note), updated by
 * the dashboard-optimization round (design-refs/hologram-bay-mood*.png):
 * - The bay OWNS the pedestal (BayPedestal). The avatar-base FBX's fused
 *   pedestal is no longer rendered (its split kept sole slices of the feet,
 *   visible when the figure turned) — base-v-2.fbx has no feet.
 * - No visible light sources: the old pilaster strips are gone. Light reads as
 *   an overhead shaft (spotlight from far above the frame), LED bands on the
 *   pedestal, and ceiling bars that exist ONLY as reflections in the floor's
 *   environment map.
 * - Fixed backdrop, not walkable: only a cheap, continuous ambient loop moves
 *   (slow emissive pulse + drifting motes). Never reactive to input.
 * - Cheap fakes over real passes: reflections come from a one-shot PMREM env
 *   map (no per-frame render target), glow from additive sprites (no bloom).
 *
 * Drop this inside a <Canvas> alongside the figure, OUTSIDE any turntable group.
 */

const WALL_RADIUS = 8;
/**
 * Deck-texture resolution. The 1024 sheet is what the mood refs were tuned
 * against; a CPU rasterizer pays for every one of those texels on upload and
 * mip generation, and at this camera distance the difference is not visible.
 */
const FLOOR_TEXTURE_SIZE = 1024;
const FLOOR_TEXTURE_SIZE_SOFTWARE = 256;

export interface HologramBayProps {
  /** Freeze the ambient pulse and drifting motes for reduced-motion users. */
  reducedMotion?: boolean;
  /** CPU rasterizer: draw the same bay, but skip the expensive prefiltering. */
  softwareRasterized?: boolean;
}

export function HologramBay({
  reducedMotion = false,
  softwareRasterized = false
}: HologramBayProps): ReactNode {
  const gl = useThree((state) => state.gl);
  const glowTexture = useMemo(createRadialGlowTexture, []);
  /**
   * PMREM prefiltering is the single most expensive thing this scene does on a
   * CPU rasterizer. Measured on headless chromium (SwiftShader) it is worth
   * ~1.2 s of the dashboard's ~1.9 s bootstrap freeze: the compositor composites
   * a WebGL canvas by reading it back synchronously on the renderer's main
   * thread, so the main thread blocks until the GPU process drains the whole
   * prefilter. A smaller cube keeps the reflections and removes most of that.
   */
  const environment = useMemo(
    () =>
      createBayEnvironment(
        gl,
        softwareRasterized ? ENVIRONMENT_SIZE_SOFTWARE : ENVIRONMENT_SIZE
      ),
    [gl, softwareRasterized]
  );
  const floorTextures = useMemo(() => {
    const textures = createFloorTextures(
      softwareRasterized ? FLOOR_TEXTURE_SIZE_SOFTWARE : FLOOR_TEXTURE_SIZE
    );
    const anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());

    // Grazing-angle sharpness: without anisotropy the seams smear to mud
    // exactly where the camera actually sees the floor.
    textures.map.anisotropy = anisotropy;
    textures.roughnessMap.anisotropy = anisotropy;

    return textures;
  }, [gl, softwareRasterized]);

  useEffect(() => () => environment.dispose(), [environment]);

  const floorMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        envMap: environment,
        envMapIntensity: 1.1,
        map: floorTextures.map,
        metalness: 0.85,
        roughness: 1,
        roughnessMap: floorTextures.roughnessMap
      }),
    [environment, floorTextures]
  );
  const padGlowMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: new THREE.Color(RIM_CYAN),
        depthWrite: false,
        map: glowTexture,
        opacity: 0.6,
        toneMapped: false,
        transparent: true
      }),
    [glowTexture]
  );
  const horizonTexture = useMemo(
    () =>
      createVerticalGradientTexture([
        [0, 0.65],
        [0.45, 0.18],
        [1, 0]
      ]),
    []
  );
  const wallMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#0a0d12"),
        metalness: 0.55,
        roughness: 0.6,
        side: THREE.BackSide
      }),
    []
  );
  const spotTarget = useMemo(() => {
    const target = new THREE.Object3D();

    target.position.set(0, 0.9, 0);

    return target;
  }, []);
  useFrame((state) => {
    if (reducedMotion) {
      padGlowMaterial.opacity = 0.6;

      return;
    }

    // Slow, low-amplitude sine so the bay reads as "alive," not flickering.
    const pulse = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 0.6);

    padGlowMaterial.opacity = 0.54 + pulse * 0.12;
  });

  return (
    <group>
      {/* Deck: tiled metal plates whose env-map reflections carry the "wet
          floor under ceiling bars" look — no per-frame reflection pass. */}
      <mesh
        material={floorMaterial}
        position={[0, PEDESTAL_BASE_Y, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[40, 48]} />
      </mesh>

      {/* Rotunda seams around the pedestal, engraved into the deck. */}
      <mesh position={[0, PEDESTAL_BASE_Y + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.32, 1.36, 96]} />
        <meshBasicMaterial color="#04070a" opacity={0.85} transparent />
      </mesh>
      <mesh position={[0, PEDESTAL_BASE_Y + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.05, 2.08, 96]} />
        <meshBasicMaterial color="#04070a" opacity={0.7} transparent />
      </mesh>
      <mesh position={[0, PEDESTAL_BASE_Y + 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.45, 2.49, 96]} />
        <meshBasicMaterial
          blending={THREE.AdditiveBlending}
          color={RIM_CYAN}
          depthWrite={false}
          opacity={0.1}
          toneMapped={false}
          transparent
        />
      </mesh>

      {/* Tight contact shadow separates the steel base from the near-black
          deck without changing the pedestal model or the fixed camera. */}
      <mesh position={[0, PEDESTAL_BASE_Y + 0.007, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[PEDESTAL_RADIUS * 0.98, PEDESTAL_RADIUS * 1.16, 96]} />
        <meshBasicMaterial color="#010204" opacity={0.62} transparent />
      </mesh>

      {/* Cyan spill pooling on the deck around the pedestal base. Kept soft: at
          the low camera angle a bright additive disc reads as the wet floor's
          vertical reflection of the glow (as in the mood ref), so low opacity
          keeps it a reflection, not a lens flare. The pedestal covers the hot
          center; only the soft skirt shows. */}
      <mesh position={[0, PEDESTAL_BASE_Y + 0.009, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[PEDESTAL_RADIUS * 1.65, 48]} />
        <meshBasicMaterial
          blending={THREE.AdditiveBlending}
          color={RIM_CYAN}
          depthWrite={false}
          map={glowTexture}
          opacity={0.08}
          toneMapped={false}
          transparent
        />
      </mesh>
      <mesh position={[0, PEDESTAL_BASE_Y + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[PEDESTAL_RADIUS * 3.15, 48]} />
        <meshBasicMaterial
          blending={THREE.AdditiveBlending}
          color={RIM_CYAN}
          depthWrite={false}
          map={glowTexture}
          opacity={0.025}
          toneMapped={false}
          transparent
        />
      </mesh>

      {/* Enclosing obsidian wall; fog swallows its far side for depth. */}
      <mesh material={wallMaterial} position={[0, 4.5, 0]}>
        <cylinderGeometry args={[WALL_RADIUS, WALL_RADIUS, 13, 48, 1, true]} />
      </mesh>

      {/* Faint machinery glow where the far wall meets the deck — depth cue
          in place of the removed pilaster colonnade. */}
      <mesh position={[0, PEDESTAL_BASE_Y + 0.8, 0]}>
        <cylinderGeometry args={[7.8, 7.8, 1.6, 48, 1, true]} />
        <meshBasicMaterial
          blending={THREE.AdditiveBlending}
          color={RIM_CYAN}
          depthWrite={false}
          map={horizonTexture}
          opacity={0.07}
          side={THREE.BackSide}
          toneMapped={false}
          transparent
        />
      </mesh>

      {/* Overhead shaft: the only strong light, its source far above frame. */}
      <spotLight
        angle={0.35}
        color="#d8f4f8"
        decay={0}
        intensity={1.05}
        penumbra={1}
        position={[0, 7, 1.8]}
        target={spotTarget}
      />
      <primitive object={spotTarget} />

      {/* The sculpted metal pedestal (base-v-2.fbx). Suspends on FBX load. */}
      <Suspense fallback={null}>
        <BayPedestal environment={environment} reducedMotion={reducedMotion} />
      </Suspense>

      {/* Projector pad: hot core + wide soft spill on the standing surface.
          Also masks the figure's open sole cut where it meets the pedestal. */}
      <mesh
        material={padGlowMaterial}
        position={[0, PEDESTAL_TOP_Y + 0.004, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[PEDESTAL_RADIUS * 0.24, 48]} />
      </mesh>
      <mesh position={[0, PEDESTAL_TOP_Y + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[PEDESTAL_RADIUS * 0.36, 48]} />
        <meshBasicMaterial
          blending={THREE.AdditiveBlending}
          color={RIM_CYAN}
          depthWrite={false}
          map={glowTexture}
          opacity={0.16}
          toneMapped={false}
          transparent
        />
      </mesh>

      <BayMotes reducedMotion={reducedMotion} />
    </group>
  );
}
