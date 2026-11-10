"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { apiFetch } from "../../shared/api/client";
import { Button } from "../../shared/ui/button";
import { clearUserSetDrafts, purgeExpiredSetDrafts } from "../session/set-draft-storage";

interface PrivacyPreferences {
  functionalStorageEnabled: boolean;
  storagePreferenceDecided: boolean;
  analyticsEnabled: boolean;
  feedbackPromptsEnabled: boolean;
}

interface DevicePrivacyContextValue {
  userId: string;
  functionalStorageEnabled: boolean;
  preferences: PrivacyPreferences | null;
  update: (patch: Partial<Pick<PrivacyPreferences, "functionalStorageEnabled" | "analyticsEnabled" | "feedbackPromptsEnabled">>) => Promise<void>;
}

const DevicePrivacyContext = createContext<DevicePrivacyContextValue | null>(null);

export function DevicePrivacyProvider({ children, userId }: { children: ReactNode; userId: string }): ReactNode {
  const [preferences, setPreferences] = useState<PrivacyPreferences | null>(null);
  const [legacyKeys, setLegacyKeys] = useState<string[]>([]);

  useEffect(() => {
    purgeExpiredSetDrafts();
  }, []);

  useEffect(() => {
    let active = true;
    void apiFetch<{ preferences: PrivacyPreferences }>("/api/users/me/privacy-preferences")
      .then((result) => { if (active) setPreferences(result.preferences); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (preferences?.storagePreferenceDecided) setLegacyKeys(findLegacyStorageKeys());
  }, [preferences?.storagePreferenceDecided]);

  const update = useCallback(async (patch: Partial<Pick<PrivacyPreferences, "functionalStorageEnabled" | "analyticsEnabled" | "feedbackPromptsEnabled">>): Promise<void> => {
    const result = await apiFetch<{ preferences: PrivacyPreferences }>("/api/users/me/privacy-preferences", { method: "PATCH", body: patch });
    if (patch.functionalStorageEnabled === false) clearUserDeviceData(userId);
    setPreferences(result.preferences);
  }, [userId]);

  const value = useMemo(() => ({
    userId,
    functionalStorageEnabled: preferences?.functionalStorageEnabled ?? false,
    preferences,
    update
  }), [preferences, update, userId]);

  return (
    <DevicePrivacyContext.Provider value={value}>
      {children}
      {preferences && !preferences.storagePreferenceDecided ? <StorageChoice onChoose={(enabled) => void update({ functionalStorageEnabled: enabled })} /> : null}
      {preferences?.storagePreferenceDecided && legacyKeys.length > 0 ? (
        <LegacyStorageChoice
          onDiscard={() => { removeLegacyKeys(legacyKeys); setLegacyKeys([]); }}
          onImport={() => { void update({ functionalStorageEnabled: true }).then(() => { importLegacyKeys(legacyKeys, userId); setLegacyKeys([]); window.location.reload(); }); }}
        />
      ) : null}
    </DevicePrivacyContext.Provider>
  );
}

const LEGACY_FUNCTIONAL_KEYS = [
  "body-cockpit.biometrics.v1",
  "body-cockpit.favorite-lifts.v1",
  "body-cockpit.display.v1"
];

const SHEET_CLASS = "fixed inset-x-0 bottom-0 z-[60] mx-auto w-full max-w-2xl rounded-t-[var(--radius-card)] bg-surface-raised px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_32px_rgba(0,0,0,0.35)]";

function SheetGrabber(): ReactNode {
  return <div aria-hidden className="mx-auto mb-3 h-1 w-9 rounded-full bg-control-line" />;
}

// Sheets, not floating cards: they stack above the tab bar and the workout mini bar.
function LegacyStorageChoice({ onDiscard, onImport }: { onDiscard(): void; onImport(): void }): ReactNode {
  return (
    <aside aria-label="Legacy device data" className={SHEET_CLASS} role="dialog">
      <SheetGrabber />
      <h2 className="text-title-3 text-text">Older device data found</h2>
      <p className="mt-2 text-subhead text-text-secondary">This browser has profile or display data saved before settings were kept per account. Import it into this account or remove it. It is never imported automatically.</p>
      <div className="mt-4 grid gap-2"><Button onClick={onImport}>Import to this account</Button><Button onClick={onDiscard} variant="secondary">Remove old data</Button></div>
    </aside>
  );
}

function findLegacyStorageKeys(): string[] {
  return LEGACY_FUNCTIONAL_KEYS.filter((key) => window.localStorage.getItem(key) !== null);
}

function removeLegacyKeys(keys: string[]): void {
  for (const key of keys) window.localStorage.removeItem(key);
}

function importLegacyKeys(keys: string[], userId: string): void {
  for (const key of keys) {
    const value = window.localStorage.getItem(key);
    if (value !== null) window.localStorage.setItem(scopedStorageKey(key, userId), value);
  }
  removeLegacyKeys(keys);
}

/**
 * For components that also render outside the provider (the hands-on example
 * has none, on purpose): null there, which callers treat as storage off.
 */
export function useOptionalDevicePrivacy(): DevicePrivacyContextValue | null {
  return useContext(DevicePrivacyContext);
}

export function useDevicePrivacy(): DevicePrivacyContextValue {
  const value = useContext(DevicePrivacyContext);
  if (!value) throw new Error("Device privacy context is unavailable.");
  return value;
}

function StorageChoice({ onChoose }: { onChoose: (enabled: boolean) => void }): ReactNode {
  return (
    <aside aria-label="Device storage choice" className={SHEET_CLASS} role="dialog">
      <SheetGrabber />
      <h2 className="text-title-3 text-text">Cookies and device storage</h2>
      <p className="mt-2 text-subhead text-text-secondary">We always use one sign-in cookie and storage that recovers an unsaved set. You can also let us save your body profile, pinned lifts and display choices on this device. No advertising cookies.</p>
      <p className="mt-2"><Link className="inline-flex min-h-11 items-center text-subhead text-accent" href="/cookies">Read the cookie and storage notice</Link></p>
      <div className="mt-2 grid gap-2"><Button onClick={() => onChoose(true)}>Save settings on this device</Button><Button onClick={() => onChoose(false)} variant="secondary">Essential only</Button></div>
    </aside>
  );
}

export function scopedStorageKey(base: string, userId: string): string {
  return `${base}:${encodeURIComponent(userId)}`;
}

export function clearUserDeviceData(userId: string): void {
  clearUserSetDrafts(userId);
  const encoded = encodeURIComponent(userId);
  for (const storage of [window.localStorage, window.sessionStorage]) {
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
    for (const key of keys) {
      if (key && (key.endsWith(`:${encoded}`) || key.includes(`:${userId}:`) || key.includes(`:${encoded}:`))) storage.removeItem(key);
    }
  }
}
