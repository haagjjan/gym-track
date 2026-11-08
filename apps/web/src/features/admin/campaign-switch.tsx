"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { apiFetch, errorMessage } from "../../shared/api/client";
import type { AdminSettings } from "./admin-types";

/**
 * Master switch for publishing campaigns. Already published campaigns keep
 * running; pause or end those individually below.
 */
export function CampaignSwitch(): ReactNode {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    void apiFetch<AdminSettings>("/api/admin/settings")
      .then(setSettings)
      .catch((error) => setNotice(errorMessage(error, "The campaign setting could not be loaded.")));
  }, []);

  async function toggle(): Promise<void> {
    if (!settings) return;
    setIsPending(true);
    try {
      const next = await apiFetch<AdminSettings>("/api/admin/settings", {
        method: "PATCH",
        body: { campaignsOpen: !settings.campaignsOpen }
      });
      setSettings(next);
      setNotice(next.campaignsOpen ? "Publishing is on. Recorded in the audit log." : "Publishing is paused. Recorded in the audit log.");
    } catch (error) {
      setNotice(errorMessage(error, "The setting could not be saved."));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-outline-dim/60 bg-surface/60 p-4">
      <div>
        <p className="text-sm font-medium text-fg">Publishing new campaigns</p>
        <p className="mt-1 text-xs leading-5 text-fg-muted">
          {settings === null ? "Loading…" : settings.campaignsOpen
            ? "On. Publishing a draft sends it to every active account (optional messages skip people who turned feedback prompts off)."
            : "Paused. Drafts can't be published until you turn this on."}
        </p>
        {notice ? <p className="mt-1 text-xs text-outline" role="status">{notice}</p> : null}
      </div>
      <button
        aria-pressed={settings?.campaignsOpen ?? false}
        className={`min-h-11 rounded border px-4 text-sm ${settings?.campaignsOpen ? "border-green/60 text-green" : "border-outline-dim text-fg-muted"}`}
        disabled={settings === null || isPending}
        onClick={() => void toggle()}
        type="button"
      >
        {settings?.campaignsOpen ? "Pause publishing" : "Turn publishing on"}
      </button>
    </div>
  );
}
