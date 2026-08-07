"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { apiFetch } from "../../shared/api/client";
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

function LegacyStorageChoice({ onDiscard, onImport }: { onDiscard(): void; onImport(): void }): ReactNode {
  return (
    <aside aria-label="Legacy device data" className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[60] mx-auto max-w-2xl rounded-xl border border-lavender/50 bg-surface p-4 shadow-2xl lg:bottom-4" role="dialog">
      <p className="font-display text-sm font-bold text-fg">OLDER DEVICE DATA FOUND</p>
      <p className="mt-2 text-xs leading-relaxed text-fg-muted">This browser has body profile or display data saved before per-account isolation was added. Import it into this account, or remove it. It will never be imported automatically.</p>
      <div className="mt-4 grid grid-cols-2 gap-3"><button className="min-h-11 rounded border border-outline-dim text-xs font-bold text-fg" onClick={onDiscard} type="button">REMOVE OLD DATA</button><button className="min-h-11 rounded border border-lavender text-xs font-bold text-lavender" onClick={onImport} type="button">IMPORT TO THIS ACCOUNT</button></div>
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

export function useDevicePrivacy(): DevicePrivacyContextValue {
  const value = useContext(DevicePrivacyContext);
  if (!value) throw new Error("Device privacy context is unavailable.");
  return value;
}

function StorageChoice({ onChoose }: { onChoose: (enabled: boolean) => void }): ReactNode {
  return (
    <aside aria-label="Device storage choice" className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-2xl rounded-xl border border-cyan/50 bg-surface p-4 shadow-2xl lg:bottom-4" role="dialog">
      <p className="font-display text-sm font-bold text-fg">COOKIE & DEVICE STORAGE</p>
      <p className="mt-2 text-xs leading-relaxed text-fg-muted">We always use one essential sign-in cookie and active-set recovery storage. Functional storage remembers body profile, favorite lifts, and display choices on this device. We use no advertising cookies.</p>
      <p className="mt-2 text-[11px]"><Link className="text-cyan" href="/cookies">Read the Cookie & Device Storage Notice</Link></p>
      <div className="mt-4 grid grid-cols-2 gap-3"><button className="min-h-11 rounded border border-outline-dim text-xs font-bold text-fg" onClick={() => onChoose(false)} type="button">ESSENTIAL ONLY</button><button className="min-h-11 rounded border border-cyan bg-cyan/10 text-xs font-bold text-cyan" onClick={() => onChoose(true)} type="button">ALLOW FUNCTIONAL</button></div>
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
