"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { errorMessage } from "../../shared/api/client";
import { useUpdateUserPreferences, useUserPreferences } from "../../shared/api/hooks";
import { Group, Row, SavedStatus, inputClass, useSavedFlash } from "./settings-ui";

/** Saves a moment after the last change, or straight away when focus leaves. */
const SAVE_DELAY_MS = 600;

export function HeatCeilingPanel(): ReactNode {
  const preferences = useUserPreferences();
  const update = useUpdateUserPreferences();
  const [value, setValue] = useState(20);
  const valueRef = useRef(20);
  // Each edit bumps the revision. A save only counts as done when no newer edit
  // arrived meanwhile, and saves never overlap, so the last value always wins.
  const revisionRef = useRef(0);
  const savedRevisionRef = useRef(0);
  const savingRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);
  const { flash, saved } = useSavedFlash();
  const isDirty = (): boolean => revisionRef.current !== savedRevisionRef.current;

  useEffect(() => {
    if (preferences.data && !isDirty() && !savingRef.current) {
      valueRef.current = preferences.data.volumeHeatCeiling;
      setValue(preferences.data.volumeHeatCeiling);
    }
  }, [preferences.data]);

  // Leaving the screen flushes a pending change instead of dropping it.
  useEffect(() => () => {
    window.clearTimeout(timerRef.current);
    void save();
    // save only reads refs and the stable mutation, so the first render's copy is fine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(): Promise<void> {
    window.clearTimeout(timerRef.current);
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      while (isDirty() && !Number.isNaN(valueRef.current)) {
        const revision = revisionRef.current;
        const bounded = Math.min(50, Math.max(5, Math.round(valueRef.current)));
        try {
          await update.mutateAsync({ volumeHeatCeiling: bounded });
        } catch {
          return;
        }
        savedRevisionRef.current = revision;
        if (!isDirty()) {
          valueRef.current = bounded;
          setValue(bounded);
          flash();
        }
      }
    } finally {
      savingRef.current = false;
    }
  }

  function change(next: number): void {
    revisionRef.current += 1;
    valueRef.current = next;
    setValue(next);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => void save(), SAVE_DELAY_MS);
  }

  return (
    <div className="space-y-2">
      <Group>
        <Row>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-body text-text">Weekly sets for full color</p>
              <p className="text-footnote text-text-secondary">How many sets in a week turn a muscle fully colored on the body map. Follows your account.</p>
            </div>
            <label className="shrink-0"><span className="sr-only">Volume heat ceiling</span><input className={`${inputClass} num w-20 text-center`} inputMode="numeric" max={50} min={5} onBlur={() => void save()} onChange={(event) => change(Number(event.currentTarget.value))} type="number" value={value} /></label>
          </div>
          <input aria-label="Volume heat ceiling slider" className="mt-3 min-h-11 w-full accent-accent" max={50} min={5} onBlur={() => void save()} onChange={(event) => change(Number(event.currentTarget.value))} onPointerUp={() => void save()} step={1} type="range" value={value} />
        </Row>
      </Group>
      {update.isError ? <p className="px-4 text-footnote text-danger" role="alert">{errorMessage(update.error, "Couldn't save the setting. Check your connection and try again.")}</p> : <SavedStatus saved={saved} />}
    </div>
  );
}
