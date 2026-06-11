import type { ReactNode } from "react";

export function HomeBodyVisual(): ReactNode {
  return (
    <div className="homeBodyVisual" aria-hidden="true">
      {/* Future upgrade could replace this visual anchor with isolated lazy-loaded 3D. */}
      <div className="homeBodyVisual__spotlight" />
      <div className="homeBodyVisual__mist" />
      <div className="homeBodyVisual__scanline" />
      <svg
        className="homeBodyVisual__avatar"
        viewBox="0 0 320 560"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="body-cockpit-avatar" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="rgba(225,253,255,0.95)" />
            <stop offset="40%" stopColor="rgba(0,219,231,0.64)" />
            <stop offset="100%" stopColor="rgba(0,219,231,0.08)" />
          </linearGradient>
        </defs>
        <circle className="homeBodyVisual__avatar-stroke" cx="160" cy="72" r="44" />
        <path
          className="homeBodyVisual__avatar-fill"
          d="M108 170c0-28 24-50 52-50s52 22 52 50v62c0 13 8 24 20 29l25 10c17 7 28 24 28 42v54c0 14-12 26-26 26h-38v117c0 12-10 22-22 22h-14c-12 0-22-10-22-22V404h-6v106c0 12-10 22-22 22h-14c-12 0-22-10-22-22V393H61c-14 0-26-12-26-26v-54c0-18 11-35 28-42l25-10c12-5 20-16 20-29v-62Z"
        />
        <path
          className="homeBodyVisual__avatar-lines"
          d="M160 122v278M108 198h104M86 304h148M98 388h124"
        />
      </svg>
      <div className="homeBodyVisual__platform">
        <span />
        <span />
        <span />
      </div>
      <span className="homeBodyVisual__callout homeBodyVisual__callout--left">
        Upper output
      </span>
      <span className="homeBodyVisual__callout homeBodyVisual__callout--right">
        Load map
      </span>
      <span className="homeBodyVisual__callout homeBodyVisual__callout--bottom">
        Session platform
      </span>
    </div>
  );
}
