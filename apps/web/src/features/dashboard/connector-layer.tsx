"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import type { SceneConnector } from "../avatar/avatar-stage";

export interface ConnectorLink {
  /** data-connector-id of the source card. */
  from: string;
  /** Body-landmark id (LANDMARK_WORLD key in avatar-stage). */
  to: string;
}

interface Segment {
  key: string;
  path: string;
  startX: number;
  startY: number;
}

/**
 * HUD leader lines, split at the canvas boundary (doc 14 Batch B): this layer
 * draws only the DOM stub from a card's edge across the page gap to the avatar
 * canvas edge — static content, so an SVG overlay is legitimate here. The
 * continuation INSIDE the canvas is real 3D geometry (ConnectorBeams in
 * avatar-stage), fed by `onSceneLinks` with each card's side and height in the
 * canvas's NDC space. Endpoints re-measure on any container/card resize;
 * desktop-only (the mobile layout stacks cards below the avatar).
 */
export function ConnectorLayer({
  containerRef,
  links,
  measureKey,
  onSceneLinks
}: {
  containerRef: RefObject<HTMLElement | null>;
  links: ConnectorLink[];
  /** Bump when async content changes card sizes. */
  measureKey: string;
  onSceneLinks: (sceneLinks: SceneConnector[]) => void;
}): ReactNode {
  const [segments, setSegments] = useState<Segment[]>([]);
  const lastSceneJsonRef = useRef("");

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    let frame = 0;

    const measure = (): void => {
      const stage = container.querySelector('[data-connector-id="avatar-stage"]');
      const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
      const nextSegments: Segment[] = [];
      const nextScene: SceneConnector[] = [];

      if (stage && isDesktop) {
        const containerRect = container.getBoundingClientRect();
        const stageRect = stage.getBoundingClientRect();

        for (const link of links) {
          const fromElement = container.querySelector(`[data-connector-id="${link.from}"]`);

          if (!fromElement) {
            continue;
          }

          const fromRect = fromElement.getBoundingClientRect();
          const cardCenterX = fromRect.left + fromRect.width / 2;
          const cardCenterY = fromRect.top + fromRect.height / 2;
          const side: SceneConnector["side"] =
            cardCenterX < stageRect.left + stageRect.width / 2 ? "left" : "right";
          // Stub: horizontal run from the card's inner edge to the canvas edge;
          // the 3D beam picks up from there at the same screen height.
          const startX =
            (side === "left" ? fromRect.right : fromRect.left) - containerRect.left;
          const endX =
            (side === "left" ? stageRect.left : stageRect.right) - containerRect.left;
          const startY = cardCenterY - containerRect.top;

          nextSegments.push({
            key: `${link.from}->${link.to}`,
            path: `M ${startX} ${startY} H ${endX}`,
            startX,
            startY
          });
          nextScene.push({
            landmarkId: link.to,
            ndcY: 1 - (2 * (cardCenterY - stageRect.top)) / Math.max(stageRect.height, 1),
            side
          });
        }
      }

      setSegments(nextSegments);

      // Only push scene links upward when they actually changed — the parent
      // stores them in state, and an unconditional call would loop render →
      // measure → setState.
      const sceneJson = JSON.stringify(nextScene);

      if (sceneJson !== lastSceneJsonRef.current) {
        lastSceneJsonRef.current = sceneJson;
        onSceneLinks(nextScene);
      }
    };

    const scheduleMeasure = (): void => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };

    scheduleMeasure();

    const observer = new ResizeObserver(scheduleMeasure);

    observer.observe(container);
    container
      .querySelectorAll("[data-connector-id]")
      .forEach((element) => observer.observe(element));
    window.addEventListener("resize", scheduleMeasure);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
    };
  }, [containerRef, links, measureKey, onSceneLinks]);

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 hidden h-full w-full lg:block"
    >
      {segments.map((segment) => (
        <g key={segment.key}>
          <path
            d={segment.path}
            fill="none"
            stroke="rgba(0, 219, 231, 0.55)"
            strokeWidth="1"
          />
          {/* Card-side terminal: small square chip. The body-side terminal is
              a 3D node inside the scene (ConnectorBeams). */}
          <rect
            fill="rgba(0, 219, 231, 0.9)"
            height="4"
            width="4"
            x={segment.startX - 2}
            y={segment.startY - 2}
          />
        </g>
      ))}
    </svg>
  );
}
