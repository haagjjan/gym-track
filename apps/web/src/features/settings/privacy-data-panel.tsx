"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ApiError, apiFetch } from "../../shared/api/client";
import { HudButton, Panel } from "../../shared/ui/ui";
import { clearUserDeviceData, useDevicePrivacy } from "../privacy/device-privacy";

export function PrivacyDataPanel(): ReactNode {
  const router = useRouter();
  const { preferences, update, userId } = useDevicePrivacy();
  const [password, setPassword] = useState("");
  const [state, setState] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);

  async function exportAccount(): Promise<void> {
    setState("Preparing export…");
    const response = await fetch("/api/users/me/export", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password })
    });
    if (!response.ok) { setState("The password was not accepted."); return; }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gym-progress-account-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setState("Export downloaded.");
  }

  async function deleteAccount(): Promise<void> {
    setState("Scheduling deletion…");
    try {
      const result = await apiFetch<{ deletionDueAt: string }>("/api/users/me/deletion", {
        method: "POST", body: { password }
      });
      clearUserDeviceData(userId);
      router.push(`/login?deletionDue=${encodeURIComponent(result.deletionDueAt)}`);
      router.refresh();
    } catch (error) {
      setState(error instanceof ApiError ? error.message : "Deletion could not be scheduled.");
    }
  }

  return (
    <div className="space-y-3">
      <Panel accent="cyan" eyebrow="PRIVACY_CONTROLS">
        <PreferenceSwitch checked={preferences?.functionalStorageEnabled ?? false} label="Functional device storage" note="Remember body profile, favorite lifts, and display choices on this device." onChange={(value) => void update({ functionalStorageEnabled: value })} />
        <PreferenceSwitch checked={preferences?.analyticsEnabled ?? false} label="Product analytics" note="Opt in to account-linked, first-party usage events retained for 90 days." onChange={(value) => void update({ analyticsEnabled: value })} />
        <PreferenceSwitch checked={preferences?.feedbackPromptsEnabled ?? true} label="Feedback prompts" note="Allow optional encouragement, rating, and feedback prompts." onChange={(value) => void update({ feedbackPromptsEnabled: value })} />
        <HudButton className="mt-3 w-full" onClick={() => { clearUserDeviceData(userId); setState("Data stored for this account on this device was cleared."); }} variant="outline">CLEAR DATA ON THIS DEVICE</HudButton>
      </Panel>
      <Panel accent="lavender" eyebrow="EXPORT_ACCOUNT_DATA">
        <p className="text-xs leading-relaxed text-fg-muted">Download your server-held account data as JSON. Workout CSV export remains available in History. Enter your current password to authorize the export.</p>
        <PasswordField onChange={setPassword} value={password} />
        <HudButton className="mt-3 w-full" disabled={!password} onClick={() => void exportAccount()} variant="outline">DOWNLOAD ACCOUNT EXPORT</HudButton>
      </Panel>
      <Panel accent="red" eyebrow="DELETE_ACCOUNT_AND_DATA">
        <p className="text-xs leading-relaxed text-fg-muted">Deletion revokes access immediately and permanently removes live account and workout data after a seven-day grace period. Export first. You can cancel from the emailed link or by contacting support before the deadline.</p>
        {!showDelete ? <HudButton className="mt-3 w-full" onClick={() => setShowDelete(true)} variant="danger">REVIEW ACCOUNT DELETION</HudButton> : (
          <div className="mt-3 rounded border border-red/50 bg-red/5 p-3">
            <p className="text-xs font-bold text-red">Your personal records and workout history will be scheduled for permanent deletion. After the deadline they cannot be recovered.</p>
            <PasswordField onChange={setPassword} value={password} />
            <div className="mt-3 grid grid-cols-2 gap-2"><HudButton onClick={() => setShowDelete(false)} variant="outline">CANCEL</HudButton><HudButton disabled={!password} onClick={() => void deleteAccount()} variant="danger">SCHEDULE DELETE</HudButton></div>
          </div>
        )}
      </Panel>
      {state ? <p className="text-xs text-outline" role="status">{state}</p> : null}
    </div>
  );
}

function PreferenceSwitch({ checked, label, note, onChange }: { checked: boolean; label: string; note: string; onChange: (value: boolean) => void }): ReactNode {
  return <div className="flex items-center justify-between gap-3 border-b border-outline-dim/40 py-3 first:pt-0 last:border-0"><div><p className="text-sm text-fg">{label}</p><p className="text-[11px] leading-relaxed text-fg-muted">{note}</p></div><button aria-checked={checked} className={`label-caps min-h-11 min-w-16 rounded border px-3 ${checked ? "border-cyan/60 bg-cyan/10 text-cyan" : "border-outline-dim text-outline"}`} onClick={() => onChange(!checked)} role="switch" type="button">{checked ? "ON" : "OFF"}</button></div>;
}

function PasswordField({ onChange, value }: { onChange: (value: string) => void; value: string }): ReactNode {
  return <label className="mt-3 block"><span className="label-caps text-outline">CURRENT_PASSWORD</span><input autoComplete="current-password" className="mt-1 min-h-11 w-full rounded border border-outline-dim bg-surface-low px-3 text-fg" onChange={(event) => onChange(event.currentTarget.value)} type="password" value={value} /></label>;
}
