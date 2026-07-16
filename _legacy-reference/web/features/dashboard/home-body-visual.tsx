"use client";

import dynamic from "next/dynamic";
import { useCallback, useState, type ReactNode } from "react";

const HomeAvatarScene = dynamic(
  () => import("./home-avatar-scene").then((module) => module.HomeAvatarScene),
  {
    loading: () => null,
    ssr: false
  }
);

export function HomeBodyVisual(): ReactNode {
  const [isSceneReady, setIsSceneReady] = useState(false);
  const handleSceneReady = useCallback(() => {
    setIsSceneReady(true);
  }, []);
  const handleSceneUnavailable = useCallback(() => {
    setIsSceneReady(false);
  }, []);

  return (
    <div
      className={isSceneReady ? "homeBodyVisual homeBodyVisual--threeReady" : "homeBodyVisual"}
      aria-hidden="true"
    >
      <div className="homeBodyVisual__spotlight" />
      <div className="homeBodyVisual__mist" />
      <div className="homeBodyVisual__scanline" />
      <div className="homeBodyVisual__scene">
        <HomeAvatarScene
          onSceneReady={handleSceneReady}
          onSceneUnavailable={handleSceneUnavailable}
        />
      </div>
      <svg
        className="homeBodyVisual__avatar"
        height="560"
        viewBox="0 0 320 560"
        width="320"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="body-cockpit-avatar" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#e1fdff" stopOpacity="0.95" />
            <stop offset="40%" stopColor="#00dbe7" stopOpacity="0.64" />
            <stop offset="100%" stopColor="#00dbe7" stopOpacity="0.08" />
          </linearGradient>
        </defs>
        <circle
          className="homeBodyVisual__avatar-stroke"
          cx="160"
          cy="72"
          fill="#e1fdff"
          fillOpacity="0.08"
          r="44"
          stroke="#e1fdff"
          strokeOpacity="0.76"
          strokeWidth="2"
        />
        <path
          className="homeBodyVisual__avatar-fill"
          d="M108 170c0-28 24-50 52-50s52 22 52 50v62c0 13 8 24 20 29l25 10c17 7 28 24 28 42v54c0 14-12 26-26 26h-38v117c0 12-10 22-22 22h-14c-12 0-22-10-22-22V404h-6v106c0 12-10 22-22 22h-14c-12 0-22-10-22-22V393H61c-14 0-26-12-26-26v-54c0-18 11-35 28-42l25-10c12-5 20-16 20-29v-62Z"
          fill="url(#body-cockpit-avatar)"
        />
        <path
          className="homeBodyVisual__avatar-lines"
          d="M160 122v278M108 198h104M86 304h148M98 388h124"
          fill="none"
          stroke="#e1fdff"
          strokeDasharray="5 10"
          strokeLinecap="round"
          strokeOpacity="0.46"
          strokeWidth="1.6"
        />
      </svg>
      <div className="homeBodyVisual__platform">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
