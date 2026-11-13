"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { TouchRotate } from "./volume-touch-rotate";
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
import { BodyLighting, BodyPedestal } from "../avatar/scene-kit";
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

/** A bounded, demand-rendered body map with raycast picking on named muscles. */
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
      <div aria-busy={support !== "unavailable" && !frame} aria-label="Muscle figure" role="group" className="relative isolate h-[clamp(17rem,42dvh,24rem)] overflow-hidden rounded-[var(--radius-card)] bg-stage lg:h-[520px]">
      {support === "ready" && !frame ? (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center text-sm text-muted" role="status">
          Loading figure…
        </div>
      ) : null}
      {support === "unavailable" ? (
        <StaticMapFallback />
      ) : support === "ready" ? (
        // Absolute wrapper: R3F writes an inline pixel width onto the canvas,
        // which would otherwise become the grid track's min-content size and
        // block the layout from ever shrinking (rotate/resize deadlock).
        <div className="absolute inset-0">
          <Canvas
            className={orbitPolicy.touchRotate ? "volume-touch-stage" : undefined}
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

            <BodyLighting theme={theme} />
            <BodyPedestal theme={theme} />

            <Suspense fallback={null}>
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

            </Suspense>

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

/** Static fallback when WebGL is unavailable (legacy Home-avatar behavior). */
function StaticMapFallback(): ReactNode {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6">
      <p className="text-headline text-text">3D body map unavailable</p>
      <p className="max-w-64 text-center text-footnote text-text-secondary">
        This device can&apos;t render 3D. Pick muscles from the list instead.
      </p>
    </div>
  );
}
