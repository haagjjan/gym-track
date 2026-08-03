import type { ReactNode } from "react";

/**
 * Static, CSS-only continuation of the hologram bay across the full viewport.
 * The live WebGL render stays bounded to a small region; these layers color-match
 * the page around it so canvas and page read as one continuous space.
 *
 * IMPORTANT: keep every layer here static. Glass panels backdrop-blur over this
 * backdrop, and an *animating* backdrop forces the compositor to re-blur every
 * panel every frame — the exact thermal trap doc 14's REWORK note bans. Ambient
 * motion lives inside the bounded canvas only.
 */
export function BayAmbience(): ReactNode {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 lg:left-60">
      {/* Grid dissolver: the page's hud-grid stops dead at the canvas rectangle,
          which silhouettes the render region — this void-colored pool swallows
          the grid lines around the stage so neither side of the boundary has
          them, and they fade back in with distance. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_72%_58%_at_50%_40%,#0a0a0a_42%,rgba(10,10,10,0)_74%)]" />
      {/* Upper glow: the bay's cyan wash behind the figure region. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_62%_46%_at_50%_30%,rgba(0,219,231,0.12),transparent_70%)]" />
      {/* Low, wide floor sheen so panels lower on the page still sit in the room. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_95%_55%_at_50%_82%,rgba(0,219,231,0.05),transparent_75%)]" />
    </div>
  );
}

/**
 * Edge treatment layered over a bounded avatar canvas: a vignette that reaches
 * FULL page-void opacity at the boundary plus a bottom melt, so the render
 * region has no findable edge — the scene dissolves into the page before the
 * canvas rectangle ends. Static gradients only — cheap to composite, never
 * blurred.
 */
export function CanvasEdgeFade(): ReactNode {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_74%_62%_at_50%_42%,transparent_52%,rgba(10,10,10,0.6)_80%,#0a0a0a_98%)]" />
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-void" />
    </div>
  );
}
