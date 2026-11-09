"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ApiError, apiFetch } from "../../shared/api/client";
import { Button } from "../../shared/ui/button";
import { ConfirmDialog } from "../../shared/ui/confirm-dialog";
import { clearUserDeviceData, useDevicePrivacy } from "../privacy/device-privacy";
import { Group, Row, SwitchRow, inputClass, useSavedFlash, SavedStatus } from "./settings-ui";

type Confirming = "clear" | "delete" | null;

export function PrivacyDataPanel(): ReactNode {
  const router = useRouter();
  const { preferences, update, userId } = useDevicePrivacy();
  const [password, setPassword] = useState("");
  const [state, setState] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [confirming, setConfirming] = useState<Confirming>(null);
  const [pending, setPending] = useState(false);
  const { flash, saved } = useSavedFlash();

  async function setPreference(patch: Parameters<typeof update>[0]): Promise<void> {
    try {
      await update(patch);
      flash();
    } catch {
      setState("Couldn't save that choice. Check your connection and try again.");
    }
  }

  async function exportAccount(): Promise<void> {
    setState("Preparing your data…");
    const response = await fetch("/api/users/me/export", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password })
    });
    if (!response.ok) { setState("That password isn't right. Check it and try again."); return; }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gym-progress-account-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setState("Your data was downloaded.");
  }

  async function deleteAccount(): Promise<void> {
    setPending(true);
    setState(null);
    try {
      const result = await apiFetch<{ deletionDueAt: string }>("/api/users/me/deletion", {
        method: "POST", body: { password }
      });
      clearUserDeviceData(userId);
      router.push(`/login?deletionDue=${encodeURIComponent(result.deletionDueAt)}`);
      router.refresh();
    } catch (error) {
      setState(error instanceof ApiError ? error.message : "Couldn't schedule the deletion. Check your connection and try again.");
    } finally {
      setPending(false);
      setConfirming(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Group>
          <SwitchRow checked={preferences?.functionalStorageEnabled ?? false} disabled={!preferences} label="Save settings on this device" note="Remembers your body profile, pinned lifts and display choices here." onChange={(value) => void setPreference({ functionalStorageEnabled: value })} />
          <SwitchRow checked={preferences?.analyticsEnabled ?? false} disabled={!preferences} label="Share usage to improve the app" note="Linked to your account and kept for 90 days." onChange={(value) => void setPreference({ analyticsEnabled: value })} />
          <SwitchRow checked={preferences?.feedbackPromptsEnabled ?? true} disabled={!preferences} label="Feedback prompts" note="Occasional requests for a rating or feedback." onChange={(value) => void setPreference({ feedbackPromptsEnabled: value })} />
          <Row><Button className="w-full" onClick={() => setConfirming("clear")} variant="destructive">Clear data on this device</Button></Row>
        </Group>
        <SavedStatus saved={saved} />
      </div>

      <Group label="Download your data">
        <Row>
          <p className="text-body text-text">Download your data</p>
          <p className="text-footnote text-text-secondary">Get a JSON copy of your account data. Workout CSV export is in History. Enter your password to confirm it’s you.</p>
          <PasswordField onChange={setPassword} value={password} />
          <Button className="mt-3 w-full" disabled={!password} onClick={() => void exportAccount()} variant="secondary">Download account data</Button>
        </Row>
      </Group>

      <Group label="Delete your account">
        <Row>
          <p className="text-body text-text">Delete your account</p>
          <p className="text-footnote text-text-secondary">Access ends right away. Your account and workout data are deleted for good after seven days. Download your data first. You can cancel from the emailed link or by contacting support before then.</p>
          {!showDelete ? <Button className="mt-3 w-full" onClick={() => setShowDelete(true)} variant="destructive">Review account deletion</Button> : (
            <div className="mt-3">
              <PasswordField onChange={setPassword} value={password} />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button onClick={() => setShowDelete(false)} variant="secondary">Cancel</Button>
                <Button disabled={!password} onClick={() => setConfirming("delete")} variant="destructive">Schedule deletion</Button>
              </div>
            </div>
          )}
        </Row>
      </Group>
      {state ? <p className="px-4 text-footnote text-text-secondary" role="status">{state}</p> : null}

      <ConfirmDialog
        confirmLabel="Clear data"
        isOpen={confirming === "clear"}
        message="This removes the settings, pinned lifts and drafts stored for this account on this device. Your workouts stay in your account."
        onCancel={() => setConfirming(null)}
        onConfirm={() => { clearUserDeviceData(userId); setConfirming(null); setState("Cleared the data stored on this device."); }}
        title="Clear data on this device?"
      />
      <ConfirmDialog
        confirmLabel="Schedule deletion"
        isOpen={confirming === "delete"}
        isPending={pending}
        message="Your workouts and personal records will be permanently deleted after seven days. After that they can't be recovered."
        onCancel={() => setConfirming(null)}
        onConfirm={() => void deleteAccount()}
        pendingLabel="Scheduling…"
        title="Delete your account?"
      />
    </div>
  );
}

function PasswordField({ onChange, value }: { onChange: (value: string) => void; value: string }): ReactNode {
  return <label className="mt-3 block"><span className="mb-1 block text-subhead text-text-secondary">Current password</span><input autoComplete="current-password" className={inputClass} onChange={(event) => onChange(event.currentTarget.value)} type="password" value={value} /></label>;
}
