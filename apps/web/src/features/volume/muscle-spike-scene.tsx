"use client";

import { OrbitControls, Stats, useFBX } from "@react-three/drei";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { createRadialGlowTexture } from "../avatar/hologram-bay";
import { AVATAR_MODEL_URL, boundsAboveHeight, RIM_CYAN, STATUE_HEIGHT } from "../avatar/statue-core";
import {
  heatT,
  measureFigureFrame,
  regionIndexBySlug,
  REGION_SLUGS,
  type FigureFrame,
  type RegionSlug
} from "./heatmap";
import { createMuscleMaskMaterial, type MaskMode } from "./muscle-mask-material";
import { getRegionMaps, MAP_LATERAL_RANGE } from "./region-map";

const ORBIT_TARGET = new THREE.Vector3(0, 1.15, 0);

export type SpikeRenderMode = MaskMode;
export type TemplateSide = "front" | "back" | "side" | null;

export interface MuscleSpikeSceneProps {
  mode: SpikeRenderMode;
  setsBySlug: Record<string, number>;
  selectedSlug: RegionSlug | null;
  onSelect: (slug: RegionSlug | null) => void;
  /** Orthographic capture mode for authoring the region maps. */
  template?: TemplateSide;
  /** Development review camera azimuth around the standing figure. */
  reviewAzimuth?: number;
}

/**
 * Isolated PoC scene for projected muscle-region masking — not a product
 * screen. "Body only" per the owner's vision: no hologram bay, plain void
 * background, soft ground shadow, pedestal hidden by the mask shader.
 */
export function MuscleSpikeScene({
  mode,
  setsBySlug,
  selectedSlug,
  onSelect,
  template = null,
  reviewAzimuth = Math.PI / 2
}: MuscleSpikeSceneProps): ReactNode {
  const clinical = mode !== "holo" || template !== null;
  const [frame, setFrame] = useState<FigureFrame | null>(null);
  const shadowTexture = useMemo(createRadialGlowTexture, []);

  return (
    <Canvas
      camera={{ fov: 34, position: [4.6, 1.5, 0.001] }}
      dpr={[1, 1.5]}
      flat
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#0a0a0a"]} />

      {clinical ? (
        <>
          {/* Neutral, clinical lighting for the clay/template read. */}
          <hemisphereLight args={["#ffffff", "#3c4147", 1.0]} />
          <directionalLight color="#ffffff" intensity={1.2} position={[3, 5, 4]} />
          <directionalLight color="#b9c6d0" intensity={0.45} position={[-4, 3, -3]} />
        </>
      ) : (
        <>
          {/* Moody hologram rig — the dashboard statue's lights. */}
          <ambientLight color="#22343c" intensity={0.45} />
          <directionalLight color="#d8f7fa" intensity={1.6} position={[3.5, 4.5, 2.5]} />
          <directionalLight color="#d9b9ff" intensity={0.7} position={[-3, 2.5, -3.5]} />
          <pointLight color={RIM_CYAN} distance={3.2} intensity={1.1} position={[0, 0.45, 0]} />
        </>
      )}

      {/* Soft ground shadow so the pedestal-less figure doesn't float. */}
      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.2, 48]} />
        <meshBasicMaterial
          color="#000000"
          depthWrite={false}
          map={shadowTexture}
          opacity={0.62}
          transparent
        />
      </mesh>

      <SpikeStatue
        mode={mode}
        onFrame={setFrame}
        onSelect={onSelect}
        selectedSlug={selectedSlug}
        setsBySlug={setsBySlug}
      />

      {template && frame ? (
        <TemplateCamera frame={frame} side={template} />
      ) : (
        <OrbitControls
          enableDamping
          enablePan={false}
          maxDistance={7}
          maxPolarAngle={1.62}
          minDistance={2.6}
          minPolarAngle={0.6}
          target={ORBIT_TARGET}
        />
      )}

      <CameraAzimuthHook active={template === null} azimuth={reviewAzimuth} />

      <Stats />
    </Canvas>
  );
}

/**
 * Orthographic camera whose bounds equal the region-map frame exactly, so a
 * screenshot in this mode is a 1:1 authoring template for the SVGs.
 */
function TemplateCamera({
  frame,
  side
}: {
  frame: FigureFrame;
  side: Exclude<TemplateSide, null>;
}): ReactNode {
  const set = useThree((state) => state.set);
  const get = useThree((state) => state.get);
  const camera = useMemo(() => {
    const orthographic = new THREE.OrthographicCamera();

    // r3f flag (not in three's types): keeps r3f from re-deriving the
    // projection from viewport pixels — the bounds ARE the region-map frame.
    (orthographic as THREE.OrthographicCamera & { manual?: boolean }).manual = true;

    return orthographic;
  }, []);

  useEffect(() => {
    const centerY = (frame.feetY + frame.headY) / 2;
    const halfWidth = MAP_LATERAL_RANGE * frame.halfWidth;
    const halfHeight = (frame.headY - frame.feetY) / 2;

    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.near = 0.1;
    camera.far = 30;
    if (side === "side") {
      // Side SVG is authored from +z. Its image left→right is world -x→+x.
      camera.position.set(0, centerY, 8);
    } else {
      camera.position.set(side === "front" ? 8 : -8, centerY, 0);
    }

    camera.up.set(0, 1, 0);
    camera.lookAt(0, centerY, 0);
    camera.updateProjectionMatrix();

    const previous = get().camera;

    set({ camera });

    return () => {
      set({ camera: previous });
    };
  }, [camera, frame, get, set, side]);

  return null;
}

function SpikeStatue({
  mode,
  setsBySlug,
  selectedSlug,
  onSelect,
  onFrame
}: {
  mode: SpikeRenderMode;
  setsBySlug: Record<string, number>;
  selectedSlug: RegionSlug | null;
  onSelect: (slug: RegionSlug | null) => void;
  onFrame: (frame: FigureFrame) => void;
}): ReactNode {
  const fbx = useFBX(AVATAR_MODEL_URL);
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

  const statue = useMemo(() => {
    // Clone so the production screens' statues (same cached FBX) stay untouched.
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

    const frame = measureFigureFrame(instance);

    mask.uniforms.uFeetY.value = frame.feetY;
    mask.uniforms.uInvHeight.value = 1 / Math.max(frame.headY - frame.feetY, 1e-6);
    mask.uniforms.uInvHalf.value = 1 / Math.max(frame.halfWidth, 1e-6);

    return { instance, frame };
  }, [fbx, mask]);

  useEffect(() => {
    onFrame(statue.frame);
  }, [onFrame, statue]);

  // The mask material handles holo / clay / debug via its mode uniform.
  useEffect(() => {
    mask.setMode(mode);
  }, [mask, mode]);

  // Data → shader uniforms.
  useEffect(() => {
    const heat = mask.uniforms.uHeat.value;

    heat.fill(0);

    for (const [slug, weeklySets] of Object.entries(setsBySlug)) {
      const regionIndex = regionIndexBySlug.get(slug);

      if (regionIndex !== undefined && regionIndex > 0) {
        heat[regionIndex] = heatT(weeklySets);
      }
    }

    mask.uniforms.uSelected.value = selectedSlug ? regionIndexBySlug.get(selectedSlug) ?? 0 : 0;
  }, [mask, selectedSlug, setsBySlug]);

  // Picking: hit-point lookup in the SAME pixels the shader samples.
  function handleClick(event: ThreeEvent<MouseEvent>): void {
    if (event.delta > 6 || !(event.object instanceof THREE.Mesh)) {
      return;
    }

    const localNormal = event.normal ?? event.face?.normal;

    if (!localNormal) {
      return;
    }

    event.stopPropagation();

    const { frame } = statue;
    const normal = localNormal.clone().transformDirection(event.object.matrixWorld);
    const xn = event.point.x / frame.halfWidth;
    const yn = (event.point.y - frame.feetY) / (frame.headY - frame.feetY);
    const zn = event.point.z / frame.halfWidth;
    const region = regionMaps.getRegionAt({ xn, zn, yn, nx: normal.x, nz: normal.z });

    if (region > 0) {
      onSelect(REGION_SLUGS[region] ?? null);
    }
  }

  return <primitive object={statue.instance} onClick={handleClick} />;
}

/** Spike-only: lets review tooling snap the camera (front = PI/2, back = -PI/2). */
function CameraAzimuthHook({ active, azimuth }: { active: boolean; azimuth: number }): ReactNode {
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    if (!active) {
      return;
    }

    const spikeWindow = window as unknown as Record<string, unknown>;
    const applyAzimuth = (nextAzimuth: number) => {
      const offset = camera.position.clone().sub(ORBIT_TARGET);
      const spherical = new THREE.Spherical().setFromVector3(offset);

      spherical.theta = nextAzimuth;
      camera.position.copy(ORBIT_TARGET).add(new THREE.Vector3().setFromSpherical(spherical));
      camera.lookAt(ORBIT_TARGET);
    };

    applyAzimuth(azimuth);
    spikeWindow.__muscleSpikeAzimuth = applyAzimuth;

    return () => {
      delete spikeWindow.__muscleSpikeAzimuth;
    };
  }, [active, azimuth, camera]);

  return null;
}
