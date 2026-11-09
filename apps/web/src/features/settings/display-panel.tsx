"use client";

import { useEffect, useState, type ReactNode } from "react";
import { radioGroupKeyDown } from "../../shared/ui/radio-group";
import { Skeleton } from "../../shared/ui/ui";
import { useDisplaySettings } from "../dashboard/use-display-settings";
import {
  DEFAULT_THEME_PREFERENCE,
  THEME_STORAGE_KEY,
  applyThemePreference,
  parseThemePreference,
  type ThemePreference
} from "../shell/theme";
import { Group, Row, SavedStatus, SwitchRow, useSavedFlash } from "./settings-ui";

const THEME_OPTIONS: { label: string; value: ThemePreference }[] = [
  { label: "System", value: "system" },
  { label: "Dark", value: "dark" },
  { label: "Light", value: "light" }
];

function readStoredTheme(): ThemePreference {
  try {
    return parseThemePreference(globalThis.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME_PREFERENCE;
  }
}

/** Theme choice and the dashboard figure's idle spin. */
export function DisplayPanel(): ReactNode {
  const { settings, save, isLoaded } = useDisplaySettings();
  const [theme, setTheme] = useState<ThemePreference>(DEFAULT_THEME_PREFERENCE);
  const { flash, saved } = useSavedFlash();

  // Read after mount so server and client markup match.
  useEffect(() => setTheme(readStoredTheme()), []);

  function choose(next: ThemePreference): void {
    setTheme(next);
    applyThemePreference(next);
    flash();
  }

  return (
    <div className="space-y-2">
      <Group>
        <Row>
          <p className="text-body text-text" id="settings-theme-label">Theme</p>
          <div aria-labelledby="settings-theme-label" className="mt-2 grid grid-cols-3 gap-1 rounded-full bg-bg p-1" onKeyDown={radioGroupKeyDown} role="radiogroup">
            {THEME_OPTIONS.map((option) => (
              <button aria-checked={theme === option.value} className={`min-h-11 rounded-full text-callout ${theme === option.value ? "bg-surface-raised font-semibold text-text" : "text-text-secondary"}`} key={option.value} onClick={() => choose(option.value)} role="radio"
          tabIndex={(theme === option.value) ? 0 : -1} type="button">{option.label}</button>
            ))}
          </div>
        </Row>
        {!isLoaded ? (
          <Row><Skeleton className="h-11" /></Row>
        ) : (
          <SwitchRow
            checked={settings.autoSpin}
            label="Spin the figure"
            note="Slowly rotates the figure on Home. Dragging it always works."
            onChange={(autoSpin) => { save({ ...settings, autoSpin }); flash(); }}
          />
        )}
      </Group>
      <SavedStatus saved={saved} />
    </div>
  );
}
