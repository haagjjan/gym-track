"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";

const MAX_TILT_DEG = 6;

export function TiltCard({
  children,
  className = ""
}: {
  children: ReactNode;
  className?: string;
}): ReactNode {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState("rotateX(0deg) rotateY(0deg)");
  const [isTilting, setIsTilting] = useState(false);

  function handlePointerMove(event: PointerEvent<HTMLDivElement>): void {
    const card = cardRef.current;

    if (!card || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const bounds = card.getBoundingClientRect();
    const offsetX = (event.clientX - bounds.left) / bounds.width - 0.5;
    const offsetY = (event.clientY - bounds.top) / bounds.height - 0.5;

    setTransform(
      `rotateX(${(-offsetY * MAX_TILT_DEG * 2).toFixed(2)}deg) rotateY(${(offsetX * MAX_TILT_DEG * 2).toFixed(2)}deg)`
    );
    setIsTilting(true);
  }

  function reset(): void {
    setTransform("rotateX(0deg) rotateY(0deg)");
    setIsTilting(false);
  }

  return (
    <div className="[perspective:900px]">
      <div
        className={`will-change-transform ${isTilting ? "duration-100" : "duration-300"} transition-transform ease-out ${className}`}
        onPointerLeave={reset}
        onPointerMove={handlePointerMove}
        ref={cardRef}
        style={{ transform }}
      >
        {children}
      </div>
    </div>
  );
}
