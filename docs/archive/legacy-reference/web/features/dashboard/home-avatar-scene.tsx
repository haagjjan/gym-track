"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  createAvatarScene,
  disposeAvatarScene,
  resizeAvatarScene,
  updateAvatarScene,
  type AvatarPointerState,
  type HomeAvatarSceneParts
} from "./home-avatar-three";

interface HomeAvatarSceneProps {
  onSceneReady?: () => void;
  onSceneUnavailable?: () => void;
}

export function HomeAvatarScene({
  onSceneReady,
  onSceneUnavailable
}: HomeAvatarSceneProps): ReactNode {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;

    if (!host || !canUseWebGl()) {
      onSceneUnavailable?.();
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointer: AvatarPointerState = { targetX: 0, targetY: 0, x: 0, y: 0 };
    let animationFrame = 0;
    let isDisposed = false;
    let isIntersecting = true;
    let parts: HomeAvatarSceneParts;

    try {
      parts = createAvatarScene(host);
      host.append(parts.renderer.domElement);
      onSceneReady?.();
    } catch {
      onSceneUnavailable?.();
      return;
    }

    const render = (time: number): void => {
      updateAvatarScene(parts, pointer, time, prefersReducedMotion);
      parts.renderer.render(parts.scene, parts.camera);
    };

    const stopAnimation = (): void => {
      if (animationFrame !== 0) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
    };

    const startAnimation = (): void => {
      if (prefersReducedMotion || animationFrame !== 0 || isDisposed) {
        return;
      }

      if (!isIntersecting || document.visibilityState === "hidden") {
        return;
      }

      animationFrame = window.requestAnimationFrame(loop);
    };

    const loop = (time: number): void => {
      animationFrame = 0;
      render(time);
      startAnimation();
    };

    const resize = (): void => {
      resizeAvatarScene(parts, host);
      render(performance.now());
    };

    const handlePointerMove = (event: PointerEvent): void => {
      const rect = host.getBoundingClientRect();
      pointer.targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    };

    const handlePointerLeave = (): void => {
      pointer.targetX = 0;
      pointer.targetY = 0;
    };

    const handleVisibilityChange = (): void => {
      if (document.visibilityState === "hidden") {
        stopAnimation();
      } else {
        render(performance.now());
        startAnimation();
      }
    };

    const resizeObserver = new ResizeObserver(resize);
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isIntersecting = entry?.isIntersecting ?? true;

        if (isIntersecting) {
          render(performance.now());
          startAnimation();
        } else {
          stopAnimation();
        }
      },
      { threshold: 0.08 }
    );

    host.addEventListener("pointermove", handlePointerMove);
    host.addEventListener("pointerleave", handlePointerLeave);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    resizeObserver.observe(host);
    intersectionObserver.observe(host);
    resize();
    startAnimation();

    return () => {
      isDisposed = true;
      stopAnimation();
      host.removeEventListener("pointermove", handlePointerMove);
      host.removeEventListener("pointerleave", handlePointerLeave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      disposeAvatarScene(parts);
    };
  }, [onSceneReady, onSceneUnavailable]);

  return <div className="homeAvatarScene" ref={hostRef} />;
}

function canUseWebGl(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}
