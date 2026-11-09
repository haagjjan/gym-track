"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "../../shared/ui/button";
import { apiFetch } from "../../shared/api/client";
import type { AuthUser } from "../auth/auth-types";
import { emptyBiometrics, useBiometrics, type Biometrics } from "../dashboard/use-biometrics";
import { IconLogout } from "../../shared/ui/icons";
import { DisplayPanel } from "./display-panel";
import { FavoriteLiftsPanel } from "./favorite-lifts-panel";
import { HeatCeilingPanel } from "./heat-ceiling-panel";
import { MergeExercisesPanel } from "./merge-exercises-panel";
import { PrivacyDataPanel } from "./privacy-data-panel";
import { RestTimerPanel } from "./rest-timer-panel";
import { HelpSupportPanel } from "./help-support-panel";
import { InfoPopover } from "../../shared/ui/info-popover";
import { Group, Row, Section, inputClass, useSavedFlash, SavedStatus } from "./settings-ui";

export function SettingsScreen({ supportUrl, user }: { supportUrl?: string | undefined; user: AuthUser }): ReactNode {
  const router = useRouter();
  const { biometrics, save, isLoaded } = useBiometrics();
  const [form, setForm] = useState<Biometrics>(emptyBiometrics);
  const { flash, saved } = useSavedFlash();

  useEffect(() => {
    if (isLoaded) setForm(biometrics);
  }, [biometrics, isLoaded]);

  async function logout(): Promise<void> {
    await apiFetch("/api/auth/logout", { method: "POST", body: {} }).catch(() => null);
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 pb-8 pt-4">
      <h1 className="text-title-1 text-text">Settings</h1>
      <Section title="Account"><AccountPanel user={user} /></Section>
      <Section title="Training"><div className="space-y-4"><RestTimerPanel /><FavoriteLiftsPanel /><HeatCeilingPanel /></div></Section>
      <Section title="Body profile"><BodyProfilePanel form={form} onChange={setForm} onSave={() => { save(form); flash(); }} saved={saved} /></Section>
      <Section title="Appearance"><DisplayPanel /></Section>
      <Section title="Privacy and data"><PrivacyDataPanel /></Section>
      <Section title="Help and legal"><HelpSupportPanel supportUrl={supportUrl} /></Section>
      <Section title="Duplicate exercises"><MergeExercisesPanel /></Section>
      <Group>
        <button className="flex min-h-11 w-full items-center justify-center gap-2 px-4 py-3 text-body text-danger active:bg-surface-raised" onClick={() => void logout()} type="button"><IconLogout aria-hidden /> Sign out</button>
      </Group>
    </div>
  );
}

function AccountPanel({ user }: { user: AuthUser }): ReactNode {
  return (
    <Group>
      <Row className="flex justify-between gap-3"><span className="shrink-0 text-body text-text-secondary">Username</span><span className="min-w-0 break-words text-right text-body text-text">{user.username}</span></Row>
      <Row className="flex justify-between gap-3"><span className="shrink-0 text-body text-text-secondary">Email</span><span className="min-w-0 break-all text-right text-body text-text">{user.email}</span></Row>
      {!user.emailVerified ? <EmailVerificationNotice /> : null}
    </Group>
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
  return (
    <Row className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-body text-warning">Email not confirmed</p>
        <p className="text-footnote text-text-secondary">Confirm your email so you can recover your account later.</p>
        {state === "failed" ? <p className="text-footnote text-danger" role="alert">Couldn&rsquo;t send the link. Try again.</p> : null}
      </div>
      <Button className="shrink-0" disabled={state === "sending" || state === "sent" || state === "not_required"} onClick={() => void resend()} size="compact" variant="plain">{state === "sent" ? "Link sent" : state === "not_required" ? "Already confirmed" : state === "sending" ? "Sending…" : state === "failed" ? "Try again" : "Resend link"}</Button>
    </Row>
  );
}

function BodyProfilePanel({ form, onChange, onSave, saved }: { form: Biometrics; onChange: (value: Biometrics) => void; onSave: () => void; saved: boolean }): ReactNode {
  return (
    <Group>
      <Row>
        <p className="mb-3 text-footnote text-text-secondary">Used for the body profile on Home. These values stay on this device.<InfoPopover label="body profile storage">Body stats are optional and saved only on this device for this account. They are not part of the account data download.</InfoPopover></p>
        <div className="grid grid-cols-2 gap-3">
          <BioField label="Age (years)" onChange={(age) => onChange({ ...form, age })} value={form.age} />
          <BioField label="Height (cm)" onChange={(heightCm) => onChange({ ...form, heightCm })} value={form.heightCm} />
          <BioField label="Weight (kg)" onChange={(weightKg) => onChange({ ...form, weightKg })} value={form.weightKg} />
          <BioField label="Body fat (%)" onChange={(bodyFatPct) => onChange({ ...form, bodyFatPct })} value={form.bodyFatPct} />
        </div>
        <Button className="mt-4 w-full" onClick={onSave}>Save body profile</Button>
        <div className="mt-2"><SavedStatus saved={saved} /></div>
      </Row>
    </Group>
  );
}

function BioField({ label, onChange, value }: { label: string; onChange: (value: number | null) => void; value: number | null }): ReactNode {
  return <label className="block"><span className="mb-1 block text-subhead text-text-secondary">{label}</span><input className={`${inputClass} num`} inputMode="decimal" onChange={(event) => { const raw = event.currentTarget.value.trim(); const parsed = Number(raw); onChange(raw.length === 0 || Number.isNaN(parsed) ? null : parsed); }} type="text" value={value ?? ""} /></label>;
}
