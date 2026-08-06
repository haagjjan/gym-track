"use client";

import type { ReactNode } from "react";
import { Panel, Skeleton } from "../../shared/ui/ui";
import { useDisplaySettings } from "../dashboard/use-display-settings";

/** Device-local controls for the dashboard and Volume 3D experiences. */
export function DisplayPanel(): ReactNode {
  const { settings, save, isLoaded } = useDisplaySettings();

  return (
    <Panel accent="cyan" eyebrow="APP_DISPLAY">
      {!isLoaded ? (
        <Skeleton className="h-28" />
      ) : (
        <div className="divide-y divide-outline-dim/50">
          <div className="flex items-center justify-between gap-3 pb-4">
            <div className="min-w-0">
              <p className="text-sm text-fg">Avatar auto-spin</p>
              <p className="text-[11px] leading-relaxed text-fg-muted">
                Idle turntable rotation of the dashboard figure. Dragging to spin always
                works. Stored on this device.
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

          <div className="flex items-center justify-between gap-3 pt-4">
            <div className="min-w-0">
              <p className="text-sm text-fg">Volume body map</p>
              <p className="text-[11px] leading-relaxed text-fg-muted">
                Use the interactive 3D body by default, or choose the lightweight 2D
                front/back map for this device.
              </p>
            </div>
            <div
              aria-label="Volume body map"
              className="flex shrink-0 gap-1"
              role="radiogroup"
            >
              {(["3d", "2d"] as const).map((view) => (
                <button
                  aria-checked={settings.volumeBodyMap === view}
                  className={`label-caps min-h-11 min-w-12 cursor-pointer rounded border px-3 transition-colors ${
                    settings.volumeBodyMap === view
                      ? "border-cyan/60 bg-cyan/10 text-cyan"
                      : "border-outline-dim text-outline hover:border-outline"
                  }`}
                  key={view}
                  onClick={() => save({ ...settings, volumeBodyMap: view })}
                  role="radio"
                  type="button"
                >
                  {view}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}
