"use client";

import type { ReactNode } from "react";
import { Button } from "../../shared/ui/button";
import { IconCheck24 } from "../../shared/ui/icons";
import { useConfirmTap } from "./use-confirm-tap";

/**
 * Bottom bar of the open workout (DESIGN.md, Navigation): the rest timer and
 * Finish, within thumb reach. It is sticky rather than fixed, so it takes its
 * own space at the end of the page and never covers the last set.
 */
export function SessionBottomBar({
  children,
  isEnding,
  onEnd,
  aboveTabBar = false
}: {
  children?: ReactNode;
  isEnding: boolean;
  onEnd: () => void;
  /** The example workout runs inside the app shell, so it sits above the tab bar. */
  aboveTabBar?: boolean;
}): ReactNode {
  const confirmEnd = useConfirmTap(onEnd);

  return (
    <div className={`sticky z-30 mt-6 border-t border-line bg-bg px-4 pt-3 ${aboveTabBar ? "bottom-[calc(var(--tabbar-height)+env(safe-area-inset-bottom))] pb-3 lg:bottom-0" : "bottom-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]"}`}>
      <div className="mx-auto max-w-5xl space-y-3">
        {children}
        <Button
          className="w-full"
          disabled={isEnding}
          onClick={confirmEnd.trigger}
          variant={confirmEnd.isArmed ? "primary" : "secondary"}
        >
          <IconCheck24 className={confirmEnd.isArmed ? "" : "text-success"} />
          {isEnding ? "Finishing…" : confirmEnd.isArmed ? "Tap again to finish" : "Finish workout"}
        </Button>
      </div>
    </div>
  );
}
