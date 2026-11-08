"use client";

import { useState, type ReactNode } from "react";
import { AuditAdminPanel } from "./audit-admin-panel";
import { CampaignAdminPanel } from "./campaign-admin-panel";
import { CampaignSwitch } from "./campaign-switch";
import { DeletionSupportPanel } from "./deletion-support-panel";
import { OverviewPanel } from "./overview-panel";
import { UserAdminPanel } from "./user-admin-panel";

type AdminSection = "overview" | "members" | "campaigns" | "audit";

const sections: ReadonlyArray<{ id: AdminSection; label: string; description: string }> = [
  {
    id: "overview",
    label: "Overview",
    description: "Exact account and usage numbers, and every account with its activity."
  },
  {
    id: "members",
    label: "Members",
    description: "Suspend, reactivate, or sign out an account, and stop a scheduled deletion."
  },
  {
    id: "campaigns",
    label: "Campaigns",
    description: "Write in-app messages, publish them, and read what people answered."
  },
  {
    id: "audit",
    label: "Audit log",
    description: "Every privileged action, newest first."
  }
];

/**
 * Administration console.
 *
 * The console is desktop-only on purpose: the tables it shows are wide, the
 * actions behind them are irreversible, and a mis-tap on a phone is not worth
 * the convenience. Small screens get an explanation instead of a cramped
 * layout, which is why the split is done in CSS rather than by sniffing the
 * viewport — the correct half renders on the first paint either way.
 */
export function AdminScreen(): ReactNode {
  const [section, setSection] = useState<AdminSection>("overview");
  const active = sections.find((item) => item.id === section) ?? sections[0];

  return (
    <>
      <div className="mx-auto max-w-md p-6 py-16 lg:hidden">
        <p className="label-caps text-lavender">Administration</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-fg">Open this on a desktop</h1>
        <p className="mt-3 text-sm leading-6 text-fg-muted">
          The administration console is only available on a large screen. Its tables are wide and
          its actions cannot be undone, so it is not offered on phones. Everything else in the app
          works here as usual.
        </p>
      </div>

      <div className="mx-auto hidden max-w-6xl space-y-6 p-4 py-8 sm:p-8 lg:block">
        <header>
          <p className="label-caps text-lavender">Administrators only</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-fg">Administration</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-fg-muted">
            See how the app is used, manage accounts, send in-app messages, and review every
            privileged action.
          </p>
        </header>

        <nav aria-label="Administration sections" className="flex flex-wrap gap-1 border-b border-outline-dim/50">
          {sections.map((item) => (
            <button
              aria-current={item.id === section ? "page" : undefined}
              className={`min-h-11 cursor-pointer rounded-t border-b-2 px-4 font-display text-xs font-bold uppercase tracking-[0.1em] transition-colors ${
                item.id === section
                  ? "border-cyan bg-cyan/10 text-cyan"
                  : "border-transparent text-fg-muted hover:bg-surface-low hover:text-fg"
              }`}
              key={item.id}
              onClick={() => setSection(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <p className="text-sm text-fg-muted">{active?.description}</p>

        {section === "overview" ? <OverviewPanel /> : null}
        {section === "members" ? (
          <>
            <UserAdminPanel />
            <DeletionSupportPanel />
          </>
        ) : null}
        {section === "campaigns" ? (
          <>
            <CampaignSwitch />
            <CampaignAdminPanel />
          </>
        ) : null}
        {section === "audit" ? <AuditAdminPanel /> : null}
      </div>
    </>
  );
}
