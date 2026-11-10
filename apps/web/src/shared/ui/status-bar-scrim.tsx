import type { ReactNode } from "react";

/**
 * Fixed backdrop behind the system status bar. In the full-screen app the
 * page scrolls under the status bar, so without it text runs into the clock
 * and icons. Zero height where there is no top inset (desktop browsers).
 */
export function StatusBarScrim(): ReactNode {
  return <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-40 h-[env(safe-area-inset-top)] bg-bg/90 backdrop-blur-md lg:hidden" />;
}
