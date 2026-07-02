"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createInitialSpikeControlState } from "./avatar-spike-state";

const AvatarSpikeScene = dynamic(
  () => import("./avatar-spike-scene").then((module) => module.AvatarSpikeScene),
  {
    loading: () => <SceneStatusPanel label="LOADING_SCENE_MODULE" />,
    ssr: false
  }
);

type SceneAvailability = "checking" | "ready" | "unavailable";

export function AvatarSpike(): ReactNode {
  const controlsRef = useRef(createInitialSpikeControlState());
  const [availability, setAvailability] = useState<SceneAvailability>("checking");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [readiness, setReadiness] = useState(controlsRef.current.readiness);
  const [prCount, setPrCount] = useState(0);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setAvailability(canUseWebGl() ? "ready" : "unavailable");
  }, []);

  function handleReadinessChange(value: number): void {
    controlsRef.current.readiness = value;
    setReadiness(value);
  }

  function handlePrEvent(): void {
    controlsRef.current.pulse = 1;
    controlsRef.current.burstProgress = 0;
    setPrCount((count) => count + 1);
  }

  useEffect(() => {
    // Spike-only test hooks so review tooling can drive the mock data feed.
    const spikeWindow = window as unknown as Record<string, unknown>;

    spikeWindow.__avatarSpikeFirePr = handlePrEvent;
    spikeWindow.__avatarSpikeSetReadiness = handleReadinessChange;
    spikeWindow.__avatarSpikeControls = controlsRef.current;

    return () => {
      delete spikeWindow.__avatarSpikeFirePr;
      delete spikeWindow.__avatarSpikeSetReadiness;
    };
  });

  return (
    <div style={pageStyle}>
      <div style={sceneHostStyle}>
        {availability === "ready" ? (
          <AvatarSpikeScene controls={controlsRef} reducedMotion={reducedMotion} />
        ) : (
          <SceneStatusPanel
            label={availability === "checking" ? "CHECKING_WEBGL" : "WEBGL_UNAVAILABLE"}
            detail={
              availability === "unavailable"
                ? "This device cannot render the 3D avatar. Production screens must fall back to a static visual."
                : undefined
            }
          />
        )}
      </div>

      <section aria-label="Spike controls" style={hudStyle}>
        <p style={hudEyebrowStyle}>PHASE_1_SPIKE // NOT_A_PRODUCT_SCREEN</p>
        <h1 style={hudTitleStyle}>AVATAR_VALIDATION</h1>
        <p style={hudCopyStyle}>
          Static trophy statue, slow turntable, cyan fresnel rim. Glow intensity tracks the mock
          readiness signal; a PR event fires a green pulse and particle burst.
        </p>

        <label style={hudFieldStyle}>
          <span style={hudLabelStyle}>READINESS_SIGNAL</span>
          <input
            max={100}
            min={0}
            onChange={(event) => handleReadinessChange(Number(event.currentTarget.value))}
            style={sliderStyle}
            type="range"
            value={readiness}
          />
          <strong style={hudValueStyle}>{readiness}%</strong>
        </label>

        <button onClick={handlePrEvent} style={prButtonStyle} type="button">
          TRIGGER_PR_EVENT
        </button>
        {prCount > 0 ? (
          <p style={hudSignalStyle}>PR_EVENTS_FIRED: {prCount}</p>
        ) : null}

        <p style={hudFootnoteStyle}>
          MODEL: /models/avatar/avatar-base.fbx · DRAG_TO_ORBIT · WHEEL_TO_ZOOM
        </p>
      </section>
    </div>
  );
}

function SceneStatusPanel({
  detail,
  label
}: {
  detail?: string | undefined;
  label: string;
}): ReactNode {
  return (
    <div style={statusPanelStyle}>
      <span style={{ color: "#00dbe7", letterSpacing: "0.12em" }}>{label}</span>
      {detail ? <p style={{ color: "#b9cacb", fontSize: 12, maxWidth: 320 }}>{detail}</p> : null}
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
  flexDirection: "column",
  fontFamily: monoStack,
  fontSize: 13,
  gap: 8,
  height: "100%",
  justifyContent: "center",
  textAlign: "center"
};

const hudStyle: CSSProperties = {
  backdropFilter: "blur(12px)",
  background: "rgba(19, 19, 19, 0.72)",
  border: "1px solid rgba(0, 242, 255, 0.26)",
  borderRadius: 12,
  bottom: 24,
  boxShadow: "0 0 24px rgba(0, 219, 231, 0.12)",
  color: "#e5e2e1",
  display: "flex",
  flexDirection: "column",
  gap: 12,
  left: 24,
  maxWidth: 340,
  padding: 20,
  position: "absolute",
  zIndex: 10
};

const hudEyebrowStyle: CSSProperties = {
  color: "#849495",
  fontSize: 10,
  letterSpacing: "0.14em",
  margin: 0
};

const hudTitleStyle: CSSProperties = {
  color: "#e1fdff",
  fontSize: 20,
  letterSpacing: "0.04em",
  margin: 0
};

const hudCopyStyle: CSSProperties = {
  color: "#b9cacb",
  fontSize: 12,
  lineHeight: 1.55,
  margin: 0
};

const hudFieldStyle: CSSProperties = {
  alignItems: "center",
  display: "grid",
  gap: 10,
  gridTemplateColumns: "auto 1fr auto"
};

const hudLabelStyle: CSSProperties = {
  color: "#849495",
  fontSize: 10,
  letterSpacing: "0.12em"
};

const hudValueStyle: CSSProperties = {
  color: "#00f2ff",
  fontSize: 13,
  minWidth: 44,
  textAlign: "right"
};

const sliderStyle: CSSProperties = {
  accentColor: "#00dbe7",
  width: "100%"
};

const prButtonStyle: CSSProperties = {
  background: "rgba(81, 251, 55, 0.12)",
  border: "1px solid rgba(81, 251, 55, 0.55)",
  borderRadius: 4,
  color: "#78ff5d",
  cursor: "pointer",
  fontFamily: monoStack,
  fontSize: 12,
  letterSpacing: "0.12em",
  padding: "10px 14px"
};

const hudSignalStyle: CSSProperties = {
  color: "#78ff5d",
  fontSize: 11,
  letterSpacing: "0.1em",
  margin: 0
};

const hudFootnoteStyle: CSSProperties = {
  color: "#849495",
  fontSize: 10,
  letterSpacing: "0.08em",
  lineHeight: 1.6,
  margin: 0
};
