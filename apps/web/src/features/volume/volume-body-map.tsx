"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject
} from "react";
import { Segmented } from "./volume-panels";
import { useAvatarSceneSupport } from "../avatar/use-avatar-scene";
import { useOptionalDevicePrivacy } from "../privacy/device-privacy";
import { FRONT_AZIMUTH, type FigureFrame } from "./heatmap";
import {
  CameraDirector,
  DEFAULT_RADIUS,
  ORBIT_TARGET,
  type OrbitControlsLike
} from "./volume-camera-director";
import { useCoarsePointer, volumeOrbitPolicy } from "./volume-interaction";
import { VolumeMuscleBody } from "./volume-muscle-body";
import { STAGE_COLOR } from "../shell/theme";
import { useResolvedTheme } from "../shell/use-resolved-theme";

export interface VolumeBodyMapProps {
  /** Weekly average working sets per muscle slug. */
  weeklySetsBySlug: Record<string, number>;
  /** The numbers and the selection are per region (true) or per muscle group. */
  byRegion: boolean;
  selectedSlug: string | null;
  onSelect: (slug: string | null) => void;
  heatCeiling: number;
  /** Paints each region a distinct hue for map/alignment inspection. */
  debugRegions?: boolean;
  /** Rendered beside the Front/Back control, above the figure. */
  toolbarEnd?: ReactNode;
}

const HINT_SEEN_KEY = "gymtrack.volume-gesture-hint-seen";

/**
 * One-time gesture hint: shown until the first drag, or for a few seconds.
 * "Seen" is only remembered when the user allowed functional device storage;
 * otherwise the hint simply shows on each visit.
 */
function useGestureHint(): [boolean, () => void] {
  const functionalStorageEnabled = useOptionalDevicePrivacy()?.functionalStorageEnabled ?? false;
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (functionalStorageEnabled) {
      try {
        if (window.localStorage.getItem(HINT_SEEN_KEY)) return;
        window.localStorage.setItem(HINT_SEEN_KEY, "1");
      } catch {
        // Storage blocked: showing the hint each visit is acceptable.
      }
    }
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 6000);
    return () => window.clearTimeout(timer);
  }, [functionalStorageEnabled]);
  return [visible, () => setVisible(false)];
}

/**
 * Muscle-volume body: a dark hologram figure whose trained muscles use the
 * shared five-stage purple heat scale, with the selection outlined. Regions come from
 * projected ID maps (region-map.ts) sampled per fragment, so boundaries are
 * crisp and picking reads the same pixels. "Body only" — no environment; the
 * fused pedestal is discarded in-shader and a cyan projector pad grounds the
 * figure. Bounded canvas by design; drag to orbit, the segmented control eases front/back.
 */
export function VolumeBodyMap({
  weeklySetsBySlug,
  byRegion,
  selectedSlug,
  onSelect,
  heatCeiling,
  debugRegions = false,
  toolbarEnd
}: VolumeBodyMapProps): ReactNode {
  const { support, reducedMotion } = useAvatarSceneSupport();
  const theme = useResolvedTheme();
  const orbitPolicy = volumeOrbitPolicy(useCoarsePointer());
  const viewRef = useRef<((azimuth: number) => void) | null>(null);
  const controlsRef = useRef<OrbitControlsLike | null>(null);
  const userOrbitRef = useRef(false);
  const [frame, setFrame] = useState<FigureFrame | null>(null);
  const [view, setView] = useState<"front" | "back" | null>("front");
  const [hintVisible, dismissHint] = useGestureHint();
  // Lift the base light when nothing is trained so the bare anatomy stays readable.

  const showView = (next: "front" | "back"): void => {
    setView(next);
    viewRef.current?.(next === "front" ? FRONT_AZIMUTH : FRONT_AZIMUTH + Math.PI);
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Figure view"
          onChange={showView}
          options={[{ id: "front", label: "Front" }, { id: "back", label: "Back" }]}
          value={view}
        />
        {toolbarEnd}
      </div>
      {/* The stage owns the canvas: isolate keeps WebGL below every card and sheet. */}
      <div className="relative isolate h-[clamp(17rem,42dvh,24rem)] overflow-hidden rounded-[var(--radius-card)] bg-stage lg:h-[520px]">
      {support === "unavailable" ? (
        <StaticMapFallback />
      ) : support === "ready" ? (
        // Absolute wrapper: R3F writes an inline pixel width onto the canvas,
        // which would otherwise become the grid track's min-content size and
        // block the layout from ever shrinking (rotate/resize deadlock).
        <div className="absolute inset-0">
          <Canvas
            camera={{ fov: 34, position: [DEFAULT_RADIUS, 1.35, 0.001] }}
            // This scene is static between interactions. Demand rendering avoids
            // an always-on 120 Hz loop on high-refresh phones; the lower DPR cap
            // also bounds the mask shader's fragment cost during orbit/focus.
            dpr={[1, 1.35]}
            flat
            frameloop="demand"
            gl={{ antialias: true, powerPreference: "high-performance" }}
            style={{ touchAction: orbitPolicy.touchAction }}
          >
            <color attach="background" args={[STAGE_COLOR[theme]]} />

            {/* Dark-body rig: the figure reads as a dim slate form, trained
                muscles emit on top. Kept low so emissive contrast survives. */}
            <hemisphereLight args={["#ffffff", "#5b6470", theme === "dark" ? 0.9 : 1.5]} />
            {/* Key from the upper front left, a weaker fill, and a back light:
                the side-on key is what makes muscle relief readable. */}
            <directionalLight color="#ffffff" intensity={theme === "dark" ? 2.2 : 1.6} position={[3, 4.5, 3.5]} />
            <directionalLight color="#cfe0f2" intensity={0.5} position={[3, 1.5, -4]} />
            <directionalLight color="#ffffff" intensity={theme === "dark" ? 1.6 : 1.1} position={[-3.5, 4, -2.5]} />

            <VolumeMuscleBody
              byRegion={byRegion}
              debugRegions={debugRegions}
              heatCeiling={heatCeiling}
              theme={theme}
              onFrame={setFrame}
              onSelect={onSelect}
              selectedSlug={selectedSlug}
              weeklySetsBySlug={weeklySetsBySlug}
            />

            <CameraDirector
              controlsRef={controlsRef}
              frame={frame}
              reducedMotion={reducedMotion}
              selectedSlug={selectedSlug}
              viewRef={viewRef}
              userOrbitRef={userOrbitRef}
            />

            <OrbitControls
              enableDamping
              enablePan={false}
              // Touch: OrbitControls stays out of the way (it would claim every
              // finger); TouchRotate turns sideways drags into rotation.
              enabled={!orbitPolicy.touchRotate}
              enableZoom={orbitPolicy.enableZoom}
              maxDistance={6}
              maxPolarAngle={1.62}
              minDistance={1.8}
              minPolarAngle={0.6}
              onStart={() => {
                // A user drag takes over — the focus ease must yield, not fight.
                userOrbitRef.current = true;
                dismissHint();
                setView(null);
              }}
              ref={(instance) => {
                controlsRef.current = instance;
              }}
              target={ORBIT_TARGET}
            />
            {orbitPolicy.touchRotate ? (
              <TouchRotate
                controlsRef={controlsRef}
                onStart={() => {
                  userOrbitRef.current = true;
                  dismissHint();
                  setView(null);
                }}
              />
            ) : null}
          </Canvas>
        </div>
      ) : null}

      {hintVisible ? (
        <p className="pointer-events-none absolute inset-x-4 bottom-3 z-10 mx-auto w-fit max-w-full rounded-full bg-black/60 px-4 py-2 text-center text-footnote text-white">
          {orbitPolicy.hint}
        </p>
      ) : null}
      </div>
    </div>
  );
}

/**
 * Phones: the canvas takes every touch (touch-action: none) and splits it by
 * direction. Sideways drags rotate the figure; vertical swipes scroll the page
 * here, with momentum on release. Letting the browser pan natively from a
 * WebGL canvas behaved differently per engine (Chromium didn't scroll, WebKit
 * did and then fought any hand-made scrolling), so one owner it is.
 */
function TouchRotate({ controlsRef, onStart }: { controlsRef: RefObject<OrbitControlsLike | null>; onStart: () => void }): ReactNode {
  const canvas = useThree((state) => state.gl.domElement);
  const invalidate = useThree((state) => state.invalidate);
  const onStartRef = useRef(onStart);
  onStartRef.current = onStart;

  useEffect(() => {
    canvas.style.touchAction = "none";
    let gesture: {
      azimuth: number;
      lastT: number;
      lastY: number;
      mode: "pending" | "horizontal" | "vertical";
      pointerId: number;
      startX: number;
      startY: number;
      velocity: number;
    } | null = null;
    let glide = 0;
    const stopGlide = (): void => { cancelAnimationFrame(glide); glide = 0; };
    const reduceMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    const down = (event: PointerEvent): void => {
      if (event.pointerType !== "touch" || !event.isPrimary) return;
      stopGlide();
      gesture = { azimuth: 0, lastT: event.timeStamp, lastY: event.clientY, mode: "pending", pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, velocity: 0 };
    };
    const move = (event: PointerEvent): void => {
      const controls = controlsRef.current;
      if (!gesture || event.pointerId !== gesture.pointerId || !controls) return;
      const deltaX = event.clientX - gesture.startX;
      const deltaY = event.clientY - gesture.startY;
      if (gesture.mode === "pending" && Math.hypot(deltaX, deltaY) >= 8) {
        gesture.mode = Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
        if (gesture.mode === "horizontal") {
          gesture.azimuth = controls.getAzimuthalAngle();
          onStartRef.current();
        }
      }
      if (gesture.mode === "horizontal") {
        // A full-width swipe turns the figure about half way round.
        controls.setAzimuthalAngle(gesture.azimuth - (deltaX / Math.max(canvas.clientWidth, 1)) * Math.PI);
        controls.update();
        invalidate();
      } else if (gesture.mode === "vertical") {
        const step = gesture.lastY - event.clientY;
        const dt = Math.max(event.timeStamp - gesture.lastT, 1);
        window.scrollBy(0, step);
        // Smoothed px/ms, for the glide after release.
        gesture.velocity = 0.8 * (step / dt) + 0.2 * gesture.velocity;
        gesture.lastY = event.clientY;
        gesture.lastT = event.timeStamp;
      }
    };
    const end = (event: PointerEvent): void => {
      if (!gesture || event.pointerId !== gesture.pointerId) return;
      let velocity = gesture.mode === "vertical" && !reduceMotion ? gesture.velocity : 0;
      gesture = null;
      if (Math.abs(velocity) < 0.05) return;
      let last = performance.now();
      const frame = (now: number): void => {
        const dt = now - last;
        last = now;
        window.scrollBy(0, velocity * dt);
        velocity *= Math.pow(0.95, dt / 16);
        glide = Math.abs(velocity) > 0.02 ? requestAnimationFrame(frame) : 0;
      };
      glide = requestAnimationFrame(frame);
    };

    canvas.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    // Any other touch on the page stops the glide, like native momentum.
    window.addEventListener("pointerdown", stopGlide, { capture: true });
    return () => {
      stopGlide();
      canvas.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      window.removeEventListener("pointerdown", stopGlide, { capture: true });
    };
  }, [canvas, controlsRef, invalidate]);

  return null;
}

/** Static fallback when WebGL is unavailable (legacy Home-avatar behavior). */
function StaticMapFallback(): ReactNode {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6">
      <p className="text-headline text-white">3D body map unavailable</p>
      <p className="max-w-64 text-center text-footnote text-white/70">
        This device can&apos;t render 3D. Pick muscles from the list instead.
      </p>
    </div>
  );
}
