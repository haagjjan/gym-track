"use client";

import type { ReactNode } from "react";
import { Panel, Skeleton } from "../../shared/ui/ui";
import { useDisplaySettings } from "../dashboard/use-display-settings";

/** Device-local controls for the dashboard figure. */
export function DisplayPanel(): ReactNode {
  const { settings, save, isLoaded } = useDisplaySettings();

  return (
    <Panel accent="cyan" eyebrow="Display">
      {!isLoaded ? (
        <Skeleton className="h-20" />
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-fg">Dashboard figure auto-spin</p>
            <p className="text-[11px] leading-relaxed text-fg-muted">
              Slow idle rotation of the figure on your dashboard. Dragging to spin it
              yourself always works. Stored on this device.
            </p>
          </div>
          <button
            aria-checked={settings.autoSpin}
            className={`label-caps min-h-11 shrink-0 cursor-pointer rounded border px-4 transition-colors ${
              settings.autoSpin
                ? "border-cyan/60 bg-cyan/10 text-cyan"
                : "border-outline-dim text-outline hover:border-outline"
            }`}
            onClick={() => save({ ...settings, autoSpin: !settings.autoSpin })}
            role="switch"
            type="button"
          >
            {settings.autoSpin ? "ON" : "OFF"}
          </button>
        </div>
      )}
    </Panel>
  );
}
