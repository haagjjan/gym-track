"use client";

import { useEffect, useState, type ReactNode } from "react";
import { radioGroupKeyDown } from "../../shared/ui/radio-group";
import { Skeleton } from "../../shared/ui/ui";
import { useDisplaySettings } from "../dashboard/use-display-settings";
import {
  DEFAULT_THEME_PREFERENCE,
  applyThemePreference,
  readStoredThemePreference,
  type ThemePreference
} from "../shell/theme";
import { Group, Row, SwitchRow } from "./settings-ui";

const THEME_OPTIONS: { label: string; value: ThemePreference }[] = [
  { label: "System", value: "system" },
  { label: "Dark", value: "dark" },
  { label: "Light", value: "light" }
];

/** Theme choice and the dashboard figure's idle spin. */
export function DisplayPanel(): ReactNode {
  const { settings, save, isLoaded } = useDisplaySettings();
  const [theme, setTheme] = useState<ThemePreference>(DEFAULT_THEME_PREFERENCE);

  // Read after mount so server and client markup match.
  useEffect(() => setTheme(readStoredThemePreference()), []);

  function choose(next: ThemePreference): void {
    setTheme(next);
    applyThemePreference(next);
  }

  return (
    <Group>
      <Row className="flex items-center justify-between gap-3">
        <p className="shrink-0 text-body text-text" id="settings-theme-label">Theme</p>
        <div aria-labelledby="settings-theme-label" className="grid grid-cols-3 gap-1 rounded-full bg-bg p-1" onKeyDown={radioGroupKeyDown} role="radiogroup">
          {THEME_OPTIONS.map((option) => (
            <button aria-checked={theme === option.value} className={`min-h-11 rounded-full px-3 text-subhead ${theme === option.value ? "bg-surface-raised font-semibold text-text" : "text-text-secondary"}`} key={option.value} onClick={() => choose(option.value)} role="radio"
              tabIndex={(theme === option.value) ? 0 : -1} type="button">{option.label}</button>
          ))}
        </div>
      </Row>
      {!isLoaded ? (
        <Row><Skeleton className="h-11" /></Row>
      ) : (
        <SwitchRow
          checked={settings.autoSpin}
          label="Spin the figure on Home"
          onChange={(autoSpin) => save({ ...settings, autoSpin })}
        />
      )}
    </Group>
  );
}
