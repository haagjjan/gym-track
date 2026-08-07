"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { HudButton, Panel } from "../../shared/ui/ui";
import { apiFetch } from "../../shared/api/client";
import type { AuthUser } from "../auth/auth-types";
import { emptyBiometrics, useBiometrics, type Biometrics } from "../dashboard/use-biometrics";
import { IconLogout } from "../shell/icons";
import { DisplayPanel } from "./display-panel";
import { FavoriteLiftsPanel } from "./favorite-lifts-panel";
import { HeatCeilingPanel } from "./heat-ceiling-panel";
import { MergeExercisesPanel } from "./merge-exercises-panel";
import { PrivacyDataPanel } from "./privacy-data-panel";
import { HelpSupportPanel } from "./help-support-panel";
import { InfoPopover } from "../../shared/ui/info-popover";

export function SettingsScreen({ user }: { user: AuthUser }): ReactNode {
  const router = useRouter();
  const { biometrics, save, isLoaded } = useBiometrics();
  const [form, setForm] = useState<Biometrics>(emptyBiometrics);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isLoaded) setForm(biometrics);
  }, [biometrics, isLoaded]);

  async function logout(): Promise<void> {
    await apiFetch("/api/auth/logout", { method: "POST", body: {} }).catch(() => null);
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 lg:p-6">
      <header><p className="label-caps text-outline">SYSTEM_CONFIG</p><h1 className="font-display text-2xl font-bold tracking-tight text-fg">Settings</h1></header>
      <SettingsSection title="Account & Security"><AccountPanel user={user} /></SettingsSection>
      <SettingsSection title="Training & Volume"><FavoriteLiftsPanel /><HeatCeilingPanel /></SettingsSection>
      <SettingsSection title="Body Profile"><BodyProfilePanel form={form} onChange={setForm} onSave={() => { save(form); setSaved(true); window.setTimeout(() => setSaved(false), 1600); }} saved={saved} /></SettingsSection>
      <SettingsSection title="Display"><DisplayPanel /></SettingsSection>
      <SettingsSection title="Privacy & Data"><PrivacyDataPanel /></SettingsSection>
      <SettingsSection title="Help & Support"><HelpSupportPanel /></SettingsSection>
      <SettingsSection title="Exercise Maintenance"><MergeExercisesPanel /></SettingsSection>
      <SettingsSection title="Sign Out"><Panel accent="red"><HudButton className="w-full" onClick={() => void logout()} variant="danger"><IconLogout /> SIGN OUT</HudButton></Panel></SettingsSection>
    </div>
  );
}

function SettingsSection({ children, title }: { children: ReactNode; title: string }): ReactNode {
  const id = `settings-${title.toLowerCase().replaceAll(/[^a-z]+/g, "-")}`;
  return <section aria-labelledby={id} className="space-y-3"><h2 className="font-display text-lg font-bold text-fg" id={id}>{title}</h2>{children}</section>;
}

function AccountPanel({ user }: { user: AuthUser }): ReactNode {
  return (
    <Panel accent="cyan">
      <dl className="space-y-1.5 text-sm"><div className="flex justify-between gap-2"><dt className="text-fg-muted">Username</dt><dd className="font-mono text-fg">{user.username}</dd></div><div className="flex justify-between gap-2"><dt className="text-fg-muted">Email</dt><dd className="truncate font-mono text-fg">{user.email}</dd></div></dl>
      {!user.emailVerified ? <EmailVerificationNotice /> : null}
      {user.betaCohort ? <p className="label-caps mt-3 rounded border border-lavender/40 bg-lavender/5 px-3 py-2 text-lavender">FOUNDING_BETA_MEMBER · ACCESS_HAS_NO_SCHEDULED_EXPIRY</p> : null}
    </Panel>
  );
}

function EmailVerificationNotice(): ReactNode {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "not_required" | "failed">("idle");
  async function resend(): Promise<void> {
    setState("sending");
    try {
      const result = await apiFetch<{ status: "FAILED" | "NOT_REQUIRED" | "SENT" }>("/api/auth/resend-verification", { method: "POST", body: {} });
      setState(result.status === "FAILED" ? "failed" : result.status === "NOT_REQUIRED" ? "not_required" : "sent");
    } catch { setState("failed"); }
  }
  return <div className="mt-3 flex flex-col gap-2 rounded-lg border border-lavender/40 bg-lavender/5 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-lavender"><span className="label-caps mr-2">EMAIL_UNVERIFIED</span>Confirm your email to secure account recovery.</p><button className="label-caps min-h-11 rounded border border-lavender/50 px-3 text-lavender" disabled={state === "sending" || state === "sent" || state === "not_required"} onClick={() => void resend()} type="button">{state === "sent" ? "LINK_SENT ✓" : state === "not_required" ? "ALREADY_VERIFIED ✓" : state === "sending" ? "SENDING…" : state === "failed" ? "RETRY_SEND" : "RESEND_LINK"}</button></div>;
}

function BodyProfilePanel({ form, onChange, onSave, saved }: { form: Biometrics; onChange: (value: Biometrics) => void; onSave: () => void; saved: boolean }): ReactNode {
  return <Panel accent="lavender"><p className="mb-3 text-[11px] leading-relaxed text-fg-muted">Used for your dashboard body profile. These values stay on this device.<InfoPopover label="body profile storage">Body profile values are optional functional storage, scoped to this account in this browser, and omitted from the server export.</InfoPopover></p><div className="grid grid-cols-2 gap-3"><BioField label="AGE" onChange={(age) => onChange({ ...form, age })} unit="YRS" value={form.age} /><BioField label="HEIGHT" onChange={(heightCm) => onChange({ ...form, heightCm })} unit="CM" value={form.heightCm} /><BioField label="WEIGHT" onChange={(weightKg) => onChange({ ...form, weightKg })} unit="KG" value={form.weightKg} /><BioField label="EST_BFP" onChange={(bodyFatPct) => onChange({ ...form, bodyFatPct })} unit="%" value={form.bodyFatPct} /></div><HudButton className="mt-4 w-full" onClick={onSave}>{saved ? "PROFILE_SAVED" : "SAVE_BODY_PROFILE"}</HudButton></Panel>;
}

function BioField({ label, onChange, unit, value }: { label: string; onChange: (value: number | null) => void; unit: string; value: number | null }): ReactNode {
  return <label className="block"><span className="label-caps text-outline">{label}</span><div className="relative mt-1"><input className="min-h-12 w-full rounded border border-outline-dim bg-surface-low/60 px-3 pr-12 font-mono text-base text-fg focus:border-cyan focus:outline-none" inputMode="decimal" onChange={(event) => { const raw = event.currentTarget.value.trim(); const parsed = Number(raw); onChange(raw.length === 0 || Number.isNaN(parsed) ? null : parsed); }} type="text" value={value ?? ""} /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-outline">{unit}</span></div></label>;
}
