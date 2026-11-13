import type { ReactNode } from "react";

/** Static edge fade matches Home's surrounding surface in each theme. */
export function CanvasEdgeFade(): ReactNode {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_74%_62%_at_50%_42%,transparent_52%,var(--home-stage)_98%)]" />
      <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-b from-transparent to-[var(--home-stage)]" />
    </div>
  );
}
