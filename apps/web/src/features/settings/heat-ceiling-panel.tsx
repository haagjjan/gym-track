"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { HudButton, Panel } from "../../shared/ui/ui";
import { errorMessage } from "../../shared/api/client";
import { useUpdateUserPreferences, useUserPreferences } from "../../shared/api/hooks";

export function HeatCeilingPanel(): ReactNode {
  const preferences = useUserPreferences();
  const update = useUpdateUserPreferences();
  const [value, setValue] = useState(20);
  const valueRef = useRef(20);
  const dirtyRef = useRef(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (preferences.data && !dirtyRef.current) {
      valueRef.current = preferences.data.volumeHeatCeiling;
      setValue(preferences.data.volumeHeatCeiling);
    }
  }, [preferences.data]);

  async function save(): Promise<void> {
    const bounded = Math.min(50, Math.max(5, Math.round(valueRef.current)));
    valueRef.current = bounded;
    setValue(bounded);
    await update.mutateAsync({ volumeHeatCeiling: bounded });
    dirtyRef.current = false;
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  }

  return (
    <Panel accent="lavender" eyebrow="Muscle heat scale">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-sm text-fg">Full heat at weekly average</p><p className="mt-1 text-[11px] leading-relaxed text-fg-muted">Sets the top of the five-stage muscle heat scale. This follows your account.</p></div>
        <label className="shrink-0"><span className="sr-only">Volume heat ceiling</span><input className="min-h-11 w-20 rounded border border-outline-dim bg-surface-low px-2 text-center font-mono text-base text-fg focus:border-lavender focus:outline-none" inputMode="numeric" max={50} min={5} onChange={(event) => { const next = Number(event.currentTarget.value); dirtyRef.current = true; valueRef.current = next; setValue(next); }} type="number" value={value} /></label>
      </div>
      <input aria-label="Volume heat ceiling slider" className="mt-4 min-h-11 w-full accent-purple-600" max={50} min={5} onChange={(event) => { const next = Number(event.currentTarget.value); dirtyRef.current = true; valueRef.current = next; setValue(next); }} step={1} type="range" value={value} />
      <div aria-live="polite" className="mt-2 min-h-5 text-[11px] text-red">{update.isError ? errorMessage(update.error, "Heat ceiling could not be saved.") : null}</div>
      <HudButton className="mt-1 w-full" disabled={preferences.isLoading || update.isPending || value < 5 || value > 50} onClick={() => void save()} variant="outline">{update.isPending ? "SAVING…" : saved ? "SAVED" : "SAVE HEAT CEILING"}</HudButton>
    </Panel>
  );
}
