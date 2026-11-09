/**
 * Theme preference (DESIGN.md, Color): dark is the default, light follows
 * prefers-color-scheme or an explicit choice. The resolved theme lives on
 * <html data-theme>, which globals.css keys every token on.
 */
export type ThemePreference = "system" | "dark" | "light";
export type ResolvedTheme = "dark" | "light";

export const THEME_STORAGE_KEY = "gymtrack.theme";

/** Follow the phone's setting unless the user picked a theme in Settings. */
export const DEFAULT_THEME_PREFERENCE: ThemePreference = "system";

/** Background per theme, for the browser and status bar chrome. */
export const THEME_BACKGROUND: Record<ResolvedTheme, string> = {
  dark: "#0b0d10",
  light: "#f2f3f5"
};

export function parseThemePreference(value: unknown): ThemePreference {
  return value === "system" || value === "dark" || value === "light" ? value : DEFAULT_THEME_PREFERENCE;
}

export function resolveTheme(preference: ThemePreference, prefersLight: boolean): ResolvedTheme {
  if (preference === "system") return prefersLight ? "light" : "dark";
  return preference;
}

/**
 * Runs before first paint (inline in <head>) so the page never flashes the
 * wrong theme. Kept dependency-free and wrapped in try/catch: storage can be
 * blocked, and then the system setting decides.
 */
export const themeBootstrapScript = `(function(){var p=${JSON.stringify(DEFAULT_THEME_PREFERENCE)};try{p=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})||p}catch(e){}var m=window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)");function a(){var l=p==="light"||(p!=="dark"&&!!(m&&m.matches));document.documentElement.dataset.theme=l?"light":"dark"}a();if(m&&m.addEventListener)m.addEventListener("change",function(){if(p==="system")a()})})();`;

/** For the Settings screen: store a preference and apply it immediately. */
export function applyThemePreference(preference: ThemePreference): void {
  try {
    if (preference === DEFAULT_THEME_PREFERENCE) globalThis.localStorage.removeItem(THEME_STORAGE_KEY);
    else globalThis.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage blocked: the choice still applies for this page view.
  }
  const prefersLight = globalThis.matchMedia?.("(prefers-color-scheme: light)").matches ?? false;
  globalThis.document.documentElement.dataset.theme = resolveTheme(preference, prefersLight);
}
