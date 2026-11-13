"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { CanvasEdgeFade } from "./bay-ambience";
import { BodyLighting, BodyPedestal, PEDESTAL_RADIUS, PEDESTAL_TOP_Y } from "./scene-kit";
import { HomeBody } from "./home-body";
import { PrBurst } from "./pr-burst";
import {
  BASE_CAMERA_HEIGHT,
  BASE_CAMERA_Z,
  CameraRig,
  fitStageCamera,
  FrameRateCap
} from "./stage-camera";
import {
  IDLE_SPIN_SPEED,
  StageDriver,
  TurntableDrag,
  type SpinState,
  type StageState
} from "./stage-driver";
import { createStatueMaterial, RIM_CYAN } from "./statue-core";
import { useAvatarSceneSupport, useFrameloopGovernor } from "./use-avatar-scene";
import { STAGE_COLOR, THEME_BACKGROUND } from "../shell/theme";
import { useResolvedTheme } from "../shell/use-resolved-theme";

/**
 * The shared figure faces +x while the camera looks down −z, so untouched the camera
 * sees the figure's right side. −90° turns the front to the camera; the ~12°
 * offset keeps the pose reading as 3D instead of a flat mugshot.
 */
const INITIAL_YAW = -Math.PI / 2 + THREE.MathUtils.degToRad(12);
/** Backbuffer scale on CPU rasterizers; below this the figure's edges crawl. */
const SOFTWARE_DPR = 0.75;

export interface AvatarStageProps {
  /** 0–100; drives rim-glow intensity. */
  readiness: number;
  /** Increment to fire a PR pulse (green flash + particle burst). */
  pulseSignal?: number;
  /** Allow drag-to-spin the figure. Camera and environment never move. */
  interactive?: boolean;
  /** Idle turntable spin (user-toggleable in Settings); drag always works. */
  autoSpin?: boolean;
}

/** Shared local body on a quiet stage; rendering pauses when offscreen. */
export function AvatarStage({
  readiness,
  pulseSignal = 0,
  interactive = true,
  autoSpin = true
}: AvatarStageProps): ReactNode {
  const { support, reducedMotion, softwareRasterized } = useAvatarSceneSupport();
  const theme = useResolvedTheme();
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

  useEffect(() => () => { statue.material.dispose(); ringMaterial.dispose(); }, [ringMaterial, statue]);

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
    <div className="home-stage relative h-full w-full" ref={hostRef}>
      {support === "unavailable" ? (
        <StaticStageFallback />
      ) : support === "ready" ? (
        // Absolute wrapper: R3F writes an inline pixel width onto the canvas,
        // which would otherwise become the grid track's min-content size and
        // block the layout from ever shrinking (rotate/resize deadlock).
        <div className="absolute inset-0">
          <Canvas
            camera={{ fov: 36, position: [0, BASE_CAMERA_HEIGHT, BASE_CAMERA_Z] }}
            // A CPU rasterizer pays per fragment, so the bootstrap frame scales
            // with the buffer. Rendering below CSS resolution there keeps the
            // scene live (never gated off) at a fraction of the fill cost.
            dpr={softwareRasterized ? SOFTWARE_DPR : [1, 1.5]}
            // Ambient rendering runs at 30 fps while visible.
            flat
            frameloop={frameloop === "always" ? "demand" : frameloop}
            gl={{ antialias: true, powerPreference: "high-performance" }}
            // Fixed camera aimed once at init (no controls own it), before any
            // child computes screen-edge points from its matrices; CameraRig
            // re-fits it on every canvas resize.
            onCreated={({ camera, size }) =>
              fitStageCamera(camera, size.width / Math.max(size.height, 1))
            }
          >
            <color attach="background" args={[theme === "light" ? THEME_BACKGROUND.light : STAGE_COLOR.dark]} />
            <BodyLighting theme={theme} />
            <BodyPedestal theme={theme} />

            <Suspense fallback={null}>
              <group ref={turntableRef} rotation={[0, INITIAL_YAW, 0]}>
                <HomeBody material={statue.material} theme={theme} />
              </group>
              <mesh
                material={ringMaterial}
                position={[0, PEDESTAL_TOP_Y + 0.006, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
              >
                <ringGeometry
                  args={[PEDESTAL_RADIUS * 0.28, PEDESTAL_RADIUS * 0.34, 96]}
                />
              </mesh>
              {!reducedMotion ? <PrBurst stateRef={stateRef} /> : null}
            </Suspense>

            <CameraRig />
            <FrameRateCap active={frameloop === "always"} />

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
      <p className="text-subhead font-semibold text-text">3D figure not available</p>
      <p className="max-w-60 text-center text-footnote text-text-secondary">
        This device can&apos;t show the 3D figure. Your numbers still update.
      </p>
    </div>
  );
}
