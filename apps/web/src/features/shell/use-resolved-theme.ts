"use client";

import { useEffect, useState } from "react";
import type { ResolvedTheme } from "./theme";

/**
 * The theme currently on <html data-theme>, updated when it changes (Settings
 * or the system appearance), for code that can't use CSS tokens (3D scenes).
 */
export function useResolvedTheme(): ResolvedTheme {
  const read = (): ResolvedTheme => (globalThis.document?.documentElement.dataset.theme === "light" ? "light" : "dark");
  const [theme, setTheme] = useState<ResolvedTheme>("dark");
  useEffect(() => {
    setTheme(read());
    const observer = new MutationObserver(() => setTheme(read()));
    observer.observe(document.documentElement, { attributeFilter: ["data-theme"], attributes: true });
    return () => observer.disconnect();
  }, []);
  return theme;
}
