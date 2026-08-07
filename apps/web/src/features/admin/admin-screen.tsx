"use client";

import type { ReactNode } from "react";
import { AuditAdminPanel } from "./audit-admin-panel";
import { BetaAdminPanel } from "./beta-admin-panel";
import { CampaignAdminPanel } from "./campaign-admin-panel";
import { DeletionSupportPanel } from "./deletion-support-panel";
import { UserAdminPanel } from "./user-admin-panel";

export function AdminScreen(): ReactNode {
  return <div className="mx-auto max-w-6xl space-y-6 p-4 py-8 sm:p-8"><header><p className="label-caps text-lavender">ADMINISTRATOR_ONLY</p><h1 className="mt-2 font-display text-3xl font-bold text-fg">Founding Beta administration</h1><p className="mt-2 text-sm text-fg-muted">Approve and contain accounts only here. Telegram contains references, never applicant identities or action links.</p></header><BetaAdminPanel /><UserAdminPanel /><DeletionSupportPanel /><CampaignAdminPanel /><AuditAdminPanel /></div>;
}
