"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
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

const MOTE_COUNT = 90;
const MOTE_FIELD_RADIUS = 5.5;
const MOTE_FIELD_HEIGHT = 6.5;
const WALL_RADIUS = 8;

export interface HologramBayProps {
  /** Freeze the ambient pulse and drifting motes for reduced-motion users. */
  reducedMotion?: boolean;
}

/** Soft radial gradient canvas texture — shared for glow pools/pads/halos. */
export function createRadialGlowTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");

  if (ctx) {
    const gradient = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2
    );
    gradient.addColorStop(0, "rgba(255,255,255,0.9)");
    gradient.addColorStop(0.4, "rgba(255,255,255,0.28)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

/**
 * Vertical white gradient strip (v axis) for the additive wall-base horizon
 * glow that stands in for the removed pilaster colonnade.
 */
function createVerticalGradientTexture(
  stops: ReadonlyArray<readonly [number, number]>
): THREE.Texture {
  const width = 4;
  const height = 128;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");

  if (ctx) {
    // Canvas y grows downward while cylinder v grows upward — flip so stop 0
    // is the BOTTOM of the mesh.
    const gradient = ctx.createLinearGradient(0, height, 0, 0);

    for (const [offset, alpha] of stops) {
      gradient.addColorStop(offset, `rgba(255,255,255,${alpha})`);
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

/**
 * Dark metal deck plates (mood ref: hologram-bay-mood.png): a 4×4 tile sheet
 * with seams, per-tile tone variance, and worn brushed streaks. The matching
 * roughness map polishes tile centers and roughens seams/wear so the env-map
 * reflection streaks break up like a used, slightly wet deck.
 */
function createFloorTextures(): { map: THREE.Texture; roughnessMap: THREE.Texture } {
  const size = 1024;
  const tiles = 4;
  const tile = size / tiles;

  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = size;
  colorCanvas.height = size;

  const roughCanvas = document.createElement("canvas");
  roughCanvas.width = size;
  roughCanvas.height = size;

  const color = colorCanvas.getContext("2d");
  const rough = roughCanvas.getContext("2d");

  if (color && rough) {
    color.fillStyle = "#0f141c";
    color.fillRect(0, 0, size, size);
    // Mid-gray base roughness ≈ 0.42 — wet-metal territory once env-mapped.
    rough.fillStyle = "#6b6b6b";
    rough.fillRect(0, 0, size, size);

    // Deterministic pseudo-random so HMR/StrictMode re-runs render identically.
    let seed = 7;
    const random = (): number => {
      seed = (seed * 16807) % 2147483647;

      return seed / 2147483647;
    };

    for (let tileY = 0; tileY < tiles; tileY += 1) {
      for (let tileX = 0; tileX < tiles; tileX += 1) {
        const x = tileX * tile;
        const y = tileY * tile;

        // Per-tile tone variance: some plates darker, some barely lighter.
        const tone = (random() - 0.45) * 10;
        color.fillStyle = `rgba(${tone > 0 ? "170,190,210" : "0,2,6"},${Math.abs(tone) / 100})`;
        color.fillRect(x, y, tile, tile);

        // Per-tile polish variance for uneven reflections.
        const polish = Math.floor(random() * 46) - 23;
        rough.fillStyle = `rgba(${polish > 0 ? "255,255,255" : "0,0,0"},${Math.abs(polish) / 255})`;
        rough.fillRect(x, y, tile, tile);

        // Brushed wear streaks, biased along one axis per plate.
        const horizontal = random() > 0.5;

        for (let streak = 0; streak < 9; streak += 1) {
          const along = random() * tile;
          const across = random() * tile;
          const length = tile * (0.2 + random() * 0.5);
          const lightness = random() > 0.6 ? "150,170,190" : "0,0,0";

          color.fillStyle = `rgba(${lightness},0.045)`;
          rough.fillStyle = "rgba(255,255,255,0.05)";

          if (horizontal) {
            color.fillRect(x + along, y + across, length, 1);
            rough.fillRect(x + along, y + across, length, 1);
          } else {
            color.fillRect(x + across, y + along, 1, length);
            rough.fillRect(x + across, y + along, 1, length);
          }
        }
      }
    }

    // Seams: dark groove + a faint worn highlight lip, rough in the groove.
    for (let line = 0; line <= tiles; line += 1) {
      const at = Math.min(line * tile, size - 2);

      color.fillStyle = "rgba(2,4,7,0.95)";
      color.fillRect(0, at, size, 3);
      color.fillRect(at, 0, 3, size);
      color.fillStyle = "rgba(150,175,200,0.12)";
      color.fillRect(0, at + 3, size, 1);
      color.fillRect(at + 3, 0, 1, size);

      rough.fillStyle = "rgba(255,255,255,0.5)";
      rough.fillRect(0, at, size, 3);
      rough.fillRect(at, 0, 3, size);
    }
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  // Floor circle spans 80 world units; the 4-tile sheet covers 8 → 2u plates.
  map.repeat.set(10, 10);

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(10, 10);

  return { map, roughnessMap };
}

/**
 * One-shot PMREM environment for the bay's metals. A throwaway scene of
 * overhead cool light bars over a dark void — the "ceiling lights" of the
 * mood refs exist only as these reflections (no visible source in frame),
 * which is what makes the floor and pedestal read as wet metal.
 */
function createBayEnvironment(gl: THREE.WebGLRenderer): THREE.Texture {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#04060a");

  const barMaterial = new THREE.MeshBasicMaterial({ color: "#bfe9f2" });
  const dimBarMaterial = new THREE.MeshBasicMaterial({ color: "#3f6672" });
  const barGeometry = new THREE.BoxGeometry(2.6, 0.08, 0.5);
  // Irregular ring of bars so floor reflections streak unevenly like the ref.
  const bars: Array<[number, number, number, boolean]> = [
    [0.3, 6.4, 3.4, true],
    [1.4, 5.8, 4.6, false],
    [2.5, 6.8, 3.0, true],
    [3.5, 6.1, 5.2, false],
    [4.4, 6.6, 3.8, true],
    [5.4, 5.9, 4.4, false]
  ];

  for (const [angle, height, radius, bright] of bars) {
    const bar = new THREE.Mesh(barGeometry, bright ? barMaterial : dimBarMaterial);

    bar.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
    bar.rotation.y = angle + Math.PI / 2;
    scene.add(bar);
  }

  // Two horizon rings the pedestal's outward metal faces reflect as a bright
  // waistline — a low, bright one near the pedestal's own height so its dark
  // outer tiers pick up a cyan sheen, plus a higher teal one for depth.
  const horizonLow = new THREE.Mesh(
    new THREE.TorusGeometry(5.2, 0.32, 8, 48),
    new THREE.MeshBasicMaterial({ color: "#37b8ce" })
  );
  horizonLow.rotation.x = Math.PI / 2;
  horizonLow.position.y = 0.5;
  scene.add(horizonLow);

  const horizon = new THREE.Mesh(
    new THREE.TorusGeometry(6.5, 0.14, 8, 48),
    new THREE.MeshBasicMaterial({ color: "#12707f" })
  );
  horizon.rotation.x = Math.PI / 2;
  horizon.position.y = 2.2;
  scene.add(horizon);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(20, 24),
    new THREE.MeshBasicMaterial({ color: "#05070a" })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const pmrem = new THREE.PMREMGenerator(gl);
  const environment = pmrem.fromScene(scene, 0.05).texture;

  pmrem.dispose();
  barGeometry.dispose();
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      (child.material as THREE.Material).dispose();
    }
  });

  return environment;
}

export function HologramBay({ reducedMotion = false }: HologramBayProps): ReactNode {
  const gl = useThree((state) => state.gl);
  const glowTexture = useMemo(createRadialGlowTexture, []);
  const environment = useMemo(() => createBayEnvironment(gl), [gl]);
  const floorTextures = useMemo(() => {
    const textures = createFloorTextures();
    const anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());

    // Grazing-angle sharpness: without anisotropy the seams smear to mud
    // exactly where the camera actually sees the floor.
    textures.map.anisotropy = anisotropy;
    textures.roughnessMap.anisotropy = anisotropy;

    return textures;
  }, [gl]);

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

  useFrame((state, delta) => {
    if (reducedMotion) {
      padGlowMaterial.opacity = 0.6;

      return;
    }

    // Slow, low-amplitude sine so the bay reads as "alive," not flickering.
    const pulse = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 0.6);

    padGlowMaterial.opacity = 0.54 + pulse * 0.12;

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

      {/* Slow drifting motes: the only continuous, non-interactive ambient loop. */}
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
    </group>
  );
}
