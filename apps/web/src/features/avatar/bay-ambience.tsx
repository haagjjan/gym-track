import type { ReactNode } from "react";

/**
 * Static, CSS-only floor glow for the hologram bay. Keep every layer static:
 * an animating backdrop forces the compositor to re-blur anything layered over it.
 *
 * `contained` keeps the glow inside its positioned parent (the Home figure card).
 * Without it the layer covers the whole viewport (Volume screen), so callers
 * must stack their own content above it.
 */
export function BayAmbience({ contained = false }: { contained?: boolean }): ReactNode {
  return (
    <div
      aria-hidden
      className={`pointer-events-none z-0 ${contained ? "absolute inset-0" : "fixed inset-0 lg:left-60"}`}
    >
      {/* Soft wash behind the figure. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_62%_46%_at_50%_30%,rgba(45,212,230,0.08),transparent_70%)]" />
      {/* Low, wide floor glow. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_95%_55%_at_50%_82%,rgba(45,212,230,0.04),transparent_75%)]" />
    </div>
  );
}

/**
 * Edge treatment layered over a bounded avatar canvas: a vignette plus a bottom
 * melt into the stage colour so the render region has no hard edge. Static
 * gradients only.
 */
export function CanvasEdgeFade(): ReactNode {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_74%_62%_at_50%_42%,transparent_52%,color-mix(in_srgb,var(--stage)_60%,transparent)_80%,var(--stage)_98%)]" />
      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-b from-transparent to-stage" />
    </div>
  );
}
