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
import {
  FRONT_AZIMUTH,
  type FigureFrame,
  type RegionSlug
} from "./heatmap";
import {
  CameraDirector,
  ORBIT_TARGET,
  type OrbitControlsLike
} from "./volume-camera-director";
import { useCoarsePointer, volumeOrbitPolicy } from "./volume-interaction";
import { VolumeMuscleBody } from "./volume-muscle-body";

export interface VolumeBodyMapProps {
  /** Weekly average working sets per muscle slug. */
  weeklySetsBySlug: Record<string, number>;
  selectedSlug: string | null;
  onSelect: (slug: RegionSlug | null) => void;
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
  selectedSlug,
  onSelect,
  heatCeiling,
  debugRegions = false,
  toolbarEnd
}: VolumeBodyMapProps): ReactNode {
  const { support, reducedMotion } = useAvatarSceneSupport();
  const orbitPolicy = volumeOrbitPolicy(useCoarsePointer());
  const viewRef = useRef<((azimuth: number) => void) | null>(null);
  const controlsRef = useRef<OrbitControlsLike | null>(null);
  const userOrbitRef = useRef(false);
  const [frame, setFrame] = useState<FigureFrame | null>(null);
  const [view, setView] = useState<"front" | "back" | null>("front");
  const [hintVisible, dismissHint] = useGestureHint();
  // Lift the base light when nothing is trained so the bare anatomy stays readable.
  const noSets = !Object.values(weeklySetsBySlug).some((sets) => sets > 0);

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
      <div className="relative isolate h-[52dvh] min-h-80 overflow-hidden rounded-[var(--radius-card)] bg-stage lg:h-[560px]">
      {support === "unavailable" ? (
        <StaticMapFallback />
      ) : support === "ready" ? (
        // Absolute wrapper: R3F writes an inline pixel width onto the canvas,
        // which would otherwise become the grid track's min-content size and
        // block the layout from ever shrinking (rotate/resize deadlock).
        <div className="absolute inset-0">
          <Canvas
            camera={{ fov: 34, position: [4.6, 1.5, 0.001] }}
            // This scene is static between interactions. Demand rendering avoids
            // an always-on 120 Hz loop on high-refresh phones; the lower DPR cap
            // also bounds the mask shader's fragment cost during orbit/focus.
            dpr={[1, 1.35]}
            flat
            frameloop="demand"
            gl={{ antialias: true, powerPreference: "high-performance" }}
            style={{ touchAction: orbitPolicy.touchAction }}
          >
            <color attach="background" args={["#0b0d10"]} />

            {/* Dark-body rig: the figure reads as a dim slate form, trained
                muscles emit on top. Kept low so emissive contrast survives. */}
            <hemisphereLight args={["#9aa6b5", "#1b2029", noSets ? 1.8 : 1.1]} />
            <directionalLight color="#eaf6ff" intensity={noSets ? 1.5 : 1} position={[3, 5, 4]} />
            <directionalLight color="#b9c6d0" intensity={0.35} position={[-4, 3, -3]} />

            <VolumeMuscleBody
              debugRegions={debugRegions}
              heatCeiling={heatCeiling}
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
              enableZoom={orbitPolicy.enableZoom}
              maxDistance={7}
              maxPolarAngle={1.62}
              minDistance={2.6}
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
            <CanvasTouchPolicy controlsRef={controlsRef} touchAction={orbitPolicy.touchAction} />
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

function CanvasTouchPolicy({
  controlsRef,
  touchAction
}: {
  controlsRef: RefObject<OrbitControlsLike | null>;
  touchAction: "none" | "pan-y";
}): ReactNode {
  const canvas = useThree((state) => state.gl.domElement);

  useEffect(() => {
    const previous = canvas.style.touchAction;
    canvas.style.touchAction = touchAction;
    let gesture: {
      lastY: number;
      mode: "horizontal" | "pending" | "vertical";
      pointerId: number;
      startX: number;
      startY: number;
    } | null = null;

    const start = (event: PointerEvent): void => {
      if (touchAction !== "pan-y" || event.pointerType !== "touch" || !event.isPrimary) return;
      gesture = {
        lastY: event.clientY,
        mode: "pending",
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY
      };
    };
    const move = (event: PointerEvent): void => {
      if (!gesture || event.pointerId !== gesture.pointerId) return;
      const deltaX = event.clientX - gesture.startX;
      const deltaY = event.clientY - gesture.startY;

      if (gesture.mode === "pending" && Math.hypot(deltaX, deltaY) >= 8) {
        gesture.mode = Math.abs(deltaY) > Math.abs(deltaX) ? "vertical" : "horizontal";
      }
      if (gesture.mode !== "vertical") return;

      if (controlsRef.current) controlsRef.current.enabled = false;
      if (event.cancelable) event.preventDefault();
      window.scrollBy({ top: gesture.lastY - event.clientY });
      gesture.lastY = event.clientY;
    };
    const finish = (event: PointerEvent): void => {
      if (!gesture || event.pointerId !== gesture.pointerId) return;
      if (controlsRef.current) controlsRef.current.enabled = true;
      gesture = null;
    };

    canvas.addEventListener("pointerdown", start, { capture: true });
    document.addEventListener("pointermove", move, { capture: true, passive: false });
    document.addEventListener("pointerup", finish, { capture: true });
    document.addEventListener("pointercancel", finish, { capture: true });

    return () => {
      canvas.removeEventListener("pointerdown", start, { capture: true });
      document.removeEventListener("pointermove", move, { capture: true });
      document.removeEventListener("pointerup", finish, { capture: true });
      document.removeEventListener("pointercancel", finish, { capture: true });
      if (canvas.style.touchAction === touchAction) canvas.style.touchAction = previous;
    };
  }, [canvas, controlsRef, touchAction]);

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
