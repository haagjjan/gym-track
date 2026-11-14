"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import type { AuthUser } from "../auth/auth-types";
import { apiFetch } from "../../shared/api/client";
import { IconAdmin, IconInbox, IconMoon, IconSun, IconThemeSystem } from "../../shared/ui/icons";
import {
  DEFAULT_THEME_PREFERENCE,
  applyThemePreference,
  nextThemePreference,
  readStoredThemePreference,
  type ThemePreference
} from "./theme";

function useHasPendingMessages(): boolean {
  const query = useQuery({
    queryKey: ["messages", "pending"],
    queryFn: ({ signal }) => apiFetch<{ items: unknown[] }>("/api/messages", { signal }),
    staleTime: 60_000
  });
  return (query.data?.items.length ?? 0) > 0;
}

const THEME_LABEL: Record<ThemePreference, string> = {
  system: "Theme: system. Switch to light mode",
  light: "Theme: light. Switch to dark mode",
  dark: "Theme: dark. Switch to system mode"
};

/**
 * Messages, theme toggle, and profile buttons for the Home header, on the
 * greeting's row. Phones only; the desktop sidebar has the navigation links.
 */
export function HomeHeaderActions({ user }: { user: AuthUser }): ReactNode {
  const hasMessages = useHasPendingMessages();
  const [theme, setTheme] = useState<ThemePreference>(DEFAULT_THEME_PREFERENCE);

  // Read after mount so server and client markup match.
  useEffect(() => setTheme(readStoredThemePreference()), []);

  function cycleTheme(): void {
    const next = nextThemePreference(theme);
    setTheme(next);
    applyThemePreference(next);
  }

  return (
    <div className="-mr-1.5 flex shrink-0 gap-1 lg:hidden">
      {user.role === "ADMIN" ? (
        <Link aria-label="Admin" className="inline-flex size-11 items-center justify-center rounded-full text-text" href="/admin">
          <IconAdmin />
        </Link>
      ) : null}
      <Link
        aria-label={hasMessages ? "Messages, new message" : "Messages"}
        className="relative inline-flex size-11 items-center justify-center rounded-full text-text"
        href="/messages"
      >
        <IconInbox />
        {hasMessages ? <span aria-hidden className="absolute right-2 top-2 size-2.5 rounded-full border-2 border-bg bg-accent" /> : null}
      </Link>
      <button
        aria-label={THEME_LABEL[theme]}
        className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full text-text"
        onClick={cycleTheme}
        title={THEME_LABEL[theme]}
        type="button"
      >
        {theme === "light" ? <IconSun /> : theme === "dark" ? <IconMoon /> : <IconThemeSystem />}
      </button>
      <Link
        aria-label={user.emailVerified ? "Profile and settings" : "Profile and settings, email not confirmed"}
        className="relative inline-flex size-11 items-center justify-center rounded-full"
        href="/settings"
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-surface-raised text-subhead font-semibold text-text">
          {user.username.charAt(0).toUpperCase()}
        </span>
        {!user.emailVerified ? <span aria-hidden className="absolute right-1 top-1 size-2.5 rounded-full border-2 border-bg bg-warning" /> : null}
      </Link>
    </div>
  );
}
