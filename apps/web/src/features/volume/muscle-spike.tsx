"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { REGION_SLUGS, type RegionSlug } from "./heatmap";
import { TARGET_WEEKLY_SETS } from "./muscle-mask-material";
import type { SpikeRenderMode, TemplateSide } from "./muscle-spike-scene";
import type { RegionProjectionPoint } from "./region-projection";
import { getRegionMaps } from "./region-map";

const MuscleSpikeScene = dynamic(
  () => import("./muscle-spike-scene").then((module) => module.MuscleSpikeScene),
  {
    loading: () => <SceneStatusPanel label="LOADING_SCENE_MODULE" />,
    ssr: false
  }
);

type SceneAvailability = "checking" | "ready" | "unavailable";

const RENDER_MODES: { id: SpikeRenderMode; label: string }[] = [
  { id: "holo", label: "HOLO" },
  { id: "clay", label: "CLAY" },
  { id: "debug", label: "DEBUG_REGIONS" }
];

const REVIEW_VIEWS = [
  { azimuth: Math.PI / 2, label: "VIEW_FRONT" },
  { azimuth: Math.PI / 4, label: "VIEW_FRONT_3Q" },
  { azimuth: 0, label: "VIEW_RIGHT" },
  { azimuth: -Math.PI / 2, label: "VIEW_BACK" },
  { azimuth: -Math.PI / 4, label: "VIEW_REAR_3Q" },
  { azimuth: Math.PI, label: "VIEW_LEFT" }
] as const;

const SCENARIOS: Record<string, Record<string, number>> = {
  empty: {},
  push: { chest: 12, shoulders: 8, triceps: 9, abs: 4 },
  pull: { back: 14, biceps: 8, forearms: 5, traps: 6 },
  legs: { quads: 12, hamstrings: 9, glutes: 10, calves: 6 },
  balanced: Object.fromEntries(REGION_SLUGS.slice(1).map((slug) => [slug, 8])),
  maxed: Object.fromEntries(REGION_SLUGS.slice(1).map((slug) => [slug, 20]))
};

/** Batch C Part 2 spike: judge per-fragment muscle masking + treatments. */
export function MuscleSpike(): ReactNode {
  const [availability, setAvailability] = useState<SceneAvailability>("checking");
  const [mode, setMode] = useState<SpikeRenderMode>("holo");
  const [scenario, setScenario] = useState<string>("push");
  const [selectedSlug, setSelectedSlug] = useState<RegionSlug | null>("chest");
  const [overrideSets, setOverrideSets] = useState<number | null>(null);
  const [template, setTemplate] = useState<TemplateSide>(null);
  const [reviewAzimuth, setReviewAzimuth] = useState(Math.PI / 2);

  useEffect(() => {
    setAvailability(canUseWebGl() ? "ready" : "unavailable");
  }, []);

  const setsBySlug = useMemo(() => {
    const preset = { ...(SCENARIOS[scenario] ?? {}) };

    if (selectedSlug && overrideSets !== null) {
      preset[selectedSlug] = overrideSets;
    }

    return preset;
  }, [overrideSets, scenario, selectedSlug]);

  useEffect(() => {
    // Spike-only test hooks so review tooling can drive the scene.
    const spikeWindow = window as unknown as Record<string, unknown>;

    spikeWindow.__muscleSpikeSetMode = setMode;
    spikeWindow.__muscleSpikeSetScenario = (name: string) => {
      setScenario(name);
      setOverrideSets(null);
    };
    spikeWindow.__muscleSpikeSetSelected = (slug: RegionSlug | null) => {
      setSelectedSlug(slug);
      setOverrideSets(null);
    };
    spikeWindow.__muscleSpikeSetSets = setOverrideSets;
    // Region-map authoring loop: 1:1 orthographic template capture, in-place
    // SVG re-rasterization, and pixel lookups for automated grid checks.
    spikeWindow.__muscleSpikeTemplate = setTemplate;
    spikeWindow.__muscleSpikeReloadMaps = () => getRegionMaps().reload();
    spikeWindow.__muscleSpikeRegionAt = (point: RegionProjectionPoint) =>
      REGION_SLUGS[getRegionMaps().getRegionAt(point)] ?? "none";

    return () => {
      delete spikeWindow.__muscleSpikeSetMode;
      delete spikeWindow.__muscleSpikeSetScenario;
      delete spikeWindow.__muscleSpikeSetSelected;
      delete spikeWindow.__muscleSpikeSetSets;
      delete spikeWindow.__muscleSpikeTemplate;
      delete spikeWindow.__muscleSpikeReloadMaps;
      delete spikeWindow.__muscleSpikeRegionAt;
    };
  }, []);

  const selectedSets = selectedSlug ? setsBySlug[selectedSlug] ?? 0 : 0;

  return (
    <div style={pageStyle}>
      <div style={sceneHostStyle}>
        {availability === "ready" ? (
          <MuscleSpikeScene
            mode={mode}
            onSelect={(slug) => {
              setSelectedSlug(slug);
              setOverrideSets(null);
            }}
            selectedSlug={selectedSlug}
            setsBySlug={setsBySlug}
            template={template}
            reviewAzimuth={reviewAzimuth}
          />
        ) : (
          <SceneStatusPanel
            label={availability === "checking" ? "CHECKING_WEBGL" : "WEBGL_UNAVAILABLE"}
          />
        )}
      </div>

      {/* HUD hides during template capture so screenshots stay clean. */}
      {template ? null : (
      <section aria-label="Spike controls" style={hudStyle}>
        <p style={eyebrowStyle}>BATCH_C_PART_2_SPIKE // NOT_A_PRODUCT_SCREEN</p>
        <h1 style={titleStyle}>MUSCLE_MASK_VALIDATION</h1>

        <div style={rowStyle}>
          {RENDER_MODES.map((entry) => (
            <button
              key={entry.id}
              onClick={() => setMode(entry.id)}
              style={chipStyle(mode === entry.id)}
              type="button"
            >
              {entry.label}
            </button>
          ))}
        </div>

        <p style={groupLabelStyle}>AUTHORING_TEMPLATE</p>
        <div style={rowStyle}>
          {(["front", "back", "side"] as const).map((side) => (
            <button
              key={side}
              onClick={() => setTemplate(side)}
              style={chipStyle(false)}
              type="button"
            >
              {side.toUpperCase()}
            </button>
          ))}
        </div>

        <p style={groupLabelStyle}>REVIEW_ORBIT</p>
        <div style={rowStyle}>
          {REVIEW_VIEWS.map((view) => (
            <button
              key={view.label}
              onClick={() => {
                setTemplate(null);
                setReviewAzimuth(view.azimuth);
              }}
              style={chipStyle(false)}
              type="button"
            >
              {view.label}
            </button>
          ))}
        </div>

        <p style={groupLabelStyle}>SCENARIO</p>
        <div style={rowStyle}>
          {Object.keys(SCENARIOS).map((name) => (
            <button
              key={name}
              onClick={() => {
                setScenario(name);
                setOverrideSets(null);
              }}
              style={chipStyle(scenario === name)}
              type="button"
            >
              {name.toUpperCase()}
            </button>
          ))}
        </div>

        <p style={groupLabelStyle}>REGION (or click the body)</p>
        <div style={rowStyle}>
          {REGION_SLUGS.slice(1).map((slug) => (
            <button
              key={slug}
              onClick={() => {
                setSelectedSlug(slug);
                setOverrideSets(null);
              }}
              style={chipStyle(selectedSlug === slug)}
              type="button"
            >
              {slug}
            </button>
          ))}
          <button
            onClick={() => setSelectedSlug(null)}
            style={chipStyle(selectedSlug === null)}
            type="button"
          >
            none
          </button>
        </div>

        {selectedSlug ? (
          <label style={fieldStyle}>
            <span style={groupLabelStyle}>
              {selectedSlug.toUpperCase()}_SETS/WK (target {TARGET_WEEKLY_SETS} → violet)
            </span>
            <input
              max={20}
              min={0}
              onChange={(event) => setOverrideSets(Number(event.currentTarget.value))}
              style={{ accentColor: "#00dbe7", width: "100%" }}
              type="range"
              value={selectedSets}
            />
            <strong style={valueStyle}>{selectedSets}</strong>
          </label>
        ) : null}

        <p style={footnoteStyle}>
          MODEL: /models/avatar/avatar-base.fbx · MAPS: /volume/muscle-regions-*.svg ·
          DRAG_TO_ORBIT · WHEEL_TO_ZOOM · picking samples the same pixels the shader renders
        </p>
      </section>
      )}
    </div>
  );
}

function SceneStatusPanel({ label }: { label: string }): ReactNode {
  return (
    <div style={statusPanelStyle}>
      <span style={{ color: "#00dbe7", letterSpacing: "0.12em" }}>{label}</span>
    </div>
  );
}

function canUseWebGl(): boolean {
  try {
    const canvas = document.createElement("canvas");

    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

const monoStack = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

const pageStyle: CSSProperties = {
  background: "#0a0a0a",
  fontFamily: monoStack,
  height: "100dvh",
  left: 0,
  overflow: "hidden",
  position: "fixed",
  top: 0,
  width: "100vw"
};

const sceneHostStyle: CSSProperties = {
  inset: 0,
  position: "absolute"
};

const statusPanelStyle: CSSProperties = {
  alignItems: "center",
  display: "flex",
  fontFamily: monoStack,
  fontSize: 13,
  height: "100%",
  justifyContent: "center"
};

const hudStyle: CSSProperties = {
  backdropFilter: "blur(12px)",
  background: "rgba(19, 19, 19, 0.78)",
  border: "1px solid rgba(0, 242, 255, 0.26)",
  borderRadius: 12,
  bottom: 20,
  color: "#e5e2e1",
  display: "flex",
  flexDirection: "column",
  gap: 10,
  left: 20,
  maxHeight: "calc(100dvh - 40px)",
  maxWidth: 400,
  overflowY: "auto",
  padding: 16,
  position: "absolute",
  zIndex: 10
};

const eyebrowStyle: CSSProperties = {
  color: "#849495",
  fontSize: 10,
  letterSpacing: "0.14em",
  margin: 0
};

const titleStyle: CSSProperties = {
  color: "#e1fdff",
  fontSize: 18,
  letterSpacing: "0.04em",
  margin: 0
};

const groupLabelStyle: CSSProperties = {
  color: "#849495",
  fontSize: 10,
  letterSpacing: "0.12em",
  margin: 0
};

const rowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6
};

const fieldStyle: CSSProperties = {
  alignItems: "center",
  display: "grid",
  gap: 8,
  gridTemplateColumns: "auto 1fr auto"
};

const valueStyle: CSSProperties = {
  color: "#00f2ff",
  fontSize: 13,
  minWidth: 28,
  textAlign: "right"
};

const footnoteStyle: CSSProperties = {
  color: "#849495",
  fontSize: 10,
  letterSpacing: "0.06em",
  lineHeight: 1.6,
  margin: 0
};

function chipStyle(active: boolean): CSSProperties {
  return {
    background: active ? "rgba(0, 242, 255, 0.16)" : "transparent",
    border: `1px solid ${active ? "#00dbe7" : "rgba(132, 148, 149, 0.4)"}`,
    borderRadius: 4,
    color: active ? "#00f2ff" : "#b9cacb",
    cursor: "pointer",
    fontFamily: monoStack,
    fontSize: 10,
    letterSpacing: "0.08em",
    padding: "5px 8px"
  };
}
