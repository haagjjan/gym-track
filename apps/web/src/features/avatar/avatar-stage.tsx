"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject
} from "react";
import * as THREE from "three";
import { CanvasEdgeFade } from "./bay-ambience";
import { createRadialGlowTexture, HologramBay } from "./hologram-bay";
import { PEDESTAL_RADIUS, PEDESTAL_TOP_Y } from "./pedestal";
import {
  createStatueMaterial,
  PULSE_GREEN,
  RIM_CYAN,
  Statue,
  type RimUniforms
} from "./statue-core";
import { useAvatarSceneSupport, useFrameloopGovernor } from "./use-avatar-scene";

const PARTICLE_COUNT = 140;
const BURST_ORIGIN = new THREE.Vector3(0, 1.25, 0);
/** Baseline turntable speed (rad/s) the figure returns to after a drag. */
const IDLE_SPIN_SPEED = 0.16;
/** Drag sensitivity: radians of figure yaw per pixel of pointer travel. */
const DRAG_SPIN_SPEED = 0.007;
/**
 * The FBX faces +x while the camera looks down −z, so untouched the camera
 * sees the figure's right side. −90° turns the front to the camera; the ~12°
 * offset keeps the pose reading as 3D instead of a flat mugshot.
 */
const INITIAL_YAW = -Math.PI / 2 + THREE.MathUtils.degToRad(12);
/** Ambient render cap — display refresh (120Hz+) buys nothing here but heat. */
const MAX_FPS = 60;
const BASE_CAMERA_HEIGHT = 1.62;
const BASE_CAMERA_Z = 4.35;
/** Pull-back ceiling: beyond this the figure drowns in the bay fog (starts at 9). */
const MAX_CAMERA_Z = 6.5;
const LOOK_TARGET = new THREE.Vector3(0, 1.05, 0);
/** World half-width (arms included) that must stay in frame at any aspect. */
const FRAME_HALF_WIDTH = 0.9;

/**
 * Aspect-aware framing: the base distance is tuned for the wide desktop
 * container, but at narrow aspects (mid-size viewports squeeze the center
 * column) a fixed camera crops the arms — pull back until the figure's width
 * fits the horizontal fov. Idempotent; called from the rig and before any
 * screen-edge math so both always agree on the projection.
 */
function fitStageCamera(camera: THREE.Camera, aspect: number): void {
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

export interface StageState {
  readiness: number;
  pulse: number;
  burstProgress: number;
}

interface SpinState {
  dragging: boolean;
  /** Figure yaw accumulated from pointer moves since the last frame. */
  pendingDelta: number;
  /** Current angular velocity (rad/s) — carries drag inertia. */
  velocity: number;
}

export interface SceneConnector {
  /** Body-landmark id (see LANDMARK_WORLD). */
  landmarkId: string;
  /** Which canvas edge the owning card sits beyond. */
  side: "left" | "right";
  /** Card center in NDC y (−1 bottom … +1 top of the canvas). */
  ndcY: number;
}

export interface AvatarStageProps {
  /** 0–100; drives rim-glow intensity. */
  readiness: number;
  /** Increment to fire a PR pulse (green flash + particle burst). */
  pulseSignal?: number;
  /** Allow drag-to-spin the figure. Camera and environment never move. */
  interactive?: boolean;
  /** Idle turntable spin (user-toggleable in Settings); drag always works. */
  autoSpin?: boolean;
  /** HUD leader lines rendered as real in-scene geometry (doc 14 Batch B). */
  connectors?: SceneConnector[];
}

/**
 * World-space body landmarks the connector beams terminate at. Fixed in the
 * scene (they do not ride the spinning figure): the nodes read as calm scan
 * points at the body's silhouette, nudged toward the camera so the mesh
 * cannot swallow them.
 */
const LANDMARK_WORLD: Record<string, [number, number, number]> = {
  "body-head": [0, 1.97, 0.14],
  "body-arm": [-0.44, 1.56, 0.1],
  "body-chest": [0.17, 1.47, 0.16],
  "body-legs": [0.06, 0.82, 0.14]
};

/**
 * Reusable dashboard avatar: static trophy statue on its sculpted pedestal,
 * slow turntable, data-reactive rim glow, standing in the shared hologram bay.
 * Render inside a sized container — the canvas is bounded on purpose; camera
 * framing is tuned for this container's aspect, and the page continues the
 * environment via static CSS (BayAmbience), not a bigger canvas.
 *
 * No postprocessing: the glow look is faked with emissive materials and
 * additive sprites (doc 14 REWORK — bloom was a thermal contributor).
 * Scene availability/reduced-motion reuse the doc-09 Home-avatar mechanism.
 */
export function AvatarStage({
  readiness,
  pulseSignal = 0,
  interactive = true,
  autoSpin = true,
  connectors = []
}: AvatarStageProps): ReactNode {
  const { support, reducedMotion } = useAvatarSceneSupport();
  const { hostRef, frameloop } = useFrameloopGovernor(reducedMotion);
  const stateRef = useRef<StageState>({ readiness, pulse: 0, burstProgress: 1 });
  const spinRef = useRef<SpinState>({
    dragging: false,
    pendingDelta: 0,
    velocity: autoSpin ? IDLE_SPIN_SPEED : 0
  });
  const turntableRef = useRef<THREE.Group>(null);
  const statue = useMemo(createStatueMaterial, []);
  const ringMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(RIM_CYAN),
        opacity: 0.4,
        side: THREE.DoubleSide,
        toneMapped: false,
        transparent: true
      }),
    []
  );

  useEffect(() => {
    stateRef.current.readiness = readiness;
  }, [readiness]);

  useEffect(() => {
    if (pulseSignal > 0) {
      stateRef.current.pulse = 1;
      stateRef.current.burstProgress = 0;
    }
  }, [pulseSignal]);

  return (
    <div className="relative h-full w-full" ref={hostRef}>
      {support === "unavailable" ? (
        <StaticStageFallback />
      ) : support === "ready" ? (
        // Absolute wrapper: R3F writes an inline pixel width onto the canvas,
        // which would otherwise become the grid track's min-content size and
        // block the layout from ever shrinking (rotate/resize deadlock).
        <div className="absolute inset-0">
          <Canvas
            camera={{ fov: 36, position: [0, BASE_CAMERA_HEIGHT, BASE_CAMERA_Z] }}
            dpr={[1, 1.5]}
            // Ambient rendering is capped at MAX_FPS: the loop runs on demand
            // and FrameRateCap invalidates at most 60×/s while visible.
            frameloop={frameloop === "always" ? "demand" : frameloop}
            gl={{ antialias: true, powerPreference: "high-performance" }}
            // Fixed camera aimed once at init (no controls own it), before any
            // child computes screen-edge points from its matrices; CameraRig
            // re-fits it on every canvas resize.
            onCreated={({ camera, size }) =>
              fitStageCamera(camera, size.width / Math.max(size.height, 1))
            }
          >
            <color attach="background" args={["#0a0a0a"]} />
            <fog attach="fog" args={["#0a0a0a", 9, 22]} />

            <ambientLight color="#22343c" intensity={0.45} />
            <directionalLight color="#d8f7fa" intensity={1.6} position={[3.5, 4.5, 2.5]} />
            <directionalLight color="#d9b9ff" intensity={0.7} position={[-3, 2.5, -3.5]} />

            <HologramBay reducedMotion={reducedMotion} />

            <Suspense fallback={null}>
              {/* Only the FIGURE rides the turntable. The FBX's fused pedestal
                  is not rendered at all anymore — its split geometry kept sole
                  slices of the feet that ghosted in place while the figure
                  turned; the bay's standalone pedestal replaces it. The 4mm lift
                  keeps the sole cut line inside the pad's projector glow. */}
              <group position={[0, 0.004, 0]} ref={turntableRef} rotation={[0, INITIAL_YAW, 0]}>
                <Statue material={statue.material} part="figure" />
              </group>
              {/* Readiness ring rides the pedestal's standing surface, just
                  outside the figure's feet, hugging the projector glow. */}
              <mesh
                material={ringMaterial}
                position={[0, PEDESTAL_TOP_Y + 0.006, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
              >
                <ringGeometry
                  args={[PEDESTAL_RADIUS * 0.28, PEDESTAL_RADIUS * 0.34, 96]}
                />
              </mesh>
              <PrBurst stateRef={stateRef} />
            </Suspense>

            <CameraRig />
            <FrameRateCap active={frameloop === "always"} />
            <ConnectorBeams connectors={connectors} />

            <StageDriver
              autoSpin={autoSpin}
              reducedMotion={reducedMotion}
              ringMaterial={ringMaterial}
              spinRef={spinRef}
              stateRef={stateRef}
              turntable={turntableRef}
              uniforms={statue.uniforms}
            />

            {/* Drag spins the FIGURE (turntable), never the camera: the bay is a
                fixed backdrop, and orbiting the camera made the whole room — floor
                streaks, light strips — appear to rotate with the statue. */}
            {interactive ? <TurntableDrag spinRef={spinRef} /> : null}
          </Canvas>
          <CanvasEdgeFade />
        </div>
      ) : null}
    </div>
  );
}

/** Static fallback when WebGL is unavailable (legacy Home-avatar behavior). */
function StaticStageFallback(): ReactNode {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2">
      <p className="label-caps text-cyan-dim">STATIC_MODE // 3D_UNAVAILABLE</p>
      <p className="max-w-56 text-center text-[11px] text-fg-muted">
        This device cannot render the 3D avatar. Metrics remain live.
      </p>
    </div>
  );
}

/** Re-fits the fixed camera whenever the canvas aspect changes. */
function CameraRig(): ReactNode {
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
function FrameRateCap({ active }: { active: boolean }): ReactNode {
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

const beamMaterial = new THREE.LineBasicMaterial({
  color: new THREE.Color(RIM_CYAN),
  opacity: 0.55,
  transparent: true
});

/**
 * HUD leader lines as real in-scene geometry (doc 14 Batch B): each beam runs
 * from a fixed world-space body landmark out to the canvas edge at its card's
 * height, where the DOM stub (ConnectorLayer) takes over across the page gap.
 * The edge point is unprojected at the landmark's depth, so the beam lives in
 * the scene's space instead of floating over it.
 */
function ConnectorBeams({ connectors }: { connectors: SceneConnector[] }): ReactNode {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const glowTexture = useMemo(createRadialGlowTexture, []);

  const beams = useMemo(() => {
    // Recompute on every canvas resize (`size` dep) with the camera already
    // fitted for that size — stale projection matrices here are exactly what
    // left beams disconnected from their DOM stubs after a viewport change.
    fitStageCamera(camera, size.width / Math.max(size.height, 1));

    return connectors.flatMap((connector) => {
      const anchor = LANDMARK_WORLD[connector.landmarkId];

      if (!anchor) {
        return [];
      }

      const landmark = new THREE.Vector3(...anchor);
      const landmarkNdcZ = landmark.clone().project(camera).z;
      // 0.9995, not 1: exactly at the frustum edge the unprojection gets
      // numerically twitchy, but anything less (the old 0.985) leaves a
      // visible pixel gap to the DOM stub outside the canvas.
      const edge = new THREE.Vector3(
        connector.side === "left" ? -0.9995 : 0.9995,
        Math.min(0.95, Math.max(-0.95, connector.ndcY)),
        landmarkNdcZ
      ).unproject(camera);
      const geometry = new THREE.BufferGeometry().setFromPoints([edge, landmark]);

      return [
        {
          key: `${connector.landmarkId}-${connector.side}`,
          landmark,
          line: new THREE.Line(geometry, beamMaterial)
        }
      ];
    });
  }, [camera, connectors, size]);

  useEffect(() => {
    return () => {
      for (const beam of beams) {
        beam.line.geometry.dispose();
      }
    };
  }, [beams]);

  return (
    <group>
      {beams.map((beam) => (
        <group key={beam.key}>
          <primitive object={beam.line} />
          {/* Body-side terminal: emissive node + soft additive halo. */}
          <mesh position={beam.landmark}>
            <sphereGeometry args={[0.016, 12, 12]} />
            <meshBasicMaterial color="#00f2ff" toneMapped={false} />
          </mesh>
          <sprite position={beam.landmark} scale={[0.14, 0.14, 0.14]}>
            <spriteMaterial
              blending={THREE.AdditiveBlending}
              color={RIM_CYAN}
              depthWrite={false}
              map={glowTexture}
              opacity={0.55}
              toneMapped={false}
              transparent
            />
          </sprite>
        </group>
      ))}
    </group>
  );
}

/** Raw pointer listeners on the canvas that feed the turntable spin state. */
function TurntableDrag({ spinRef }: { spinRef: RefObject<SpinState> }): ReactNode {
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

function StageDriver({
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
