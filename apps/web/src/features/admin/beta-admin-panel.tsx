"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { apiFetch, errorMessage } from "../../shared/api/client";
import { HudButton, Panel } from "../../shared/ui/ui";
import { FilterBar, ResultCount, SearchFilter, SelectFilter, humanise, matchesSearch } from "./admin-filters";

interface Settings { waitlistOpen: boolean; invitationsOpen: boolean; campaignsOpen: boolean; accountCap: number; dailyApprovalLimit: number; }
interface Request { id: string; email: string; status: "PENDING" | "INVITED" | "JOINED" | "EXPIRED" | "BLOCKED"; requestedAt: string; invitationExpiresAt: string | null; }

const requestStatuses = ["PENDING", "INVITED", "JOINED", "EXPIRED", "BLOCKED"] as const;

export function BetaAdminPanel(): ReactNode {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [state, setState] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const load = useCallback(async () => {
    const [settingsResult, requestsResult] = await Promise.all([
      apiFetch<{ settings: Settings }>("/api/admin/beta/settings"),
      apiFetch<{ items: Request[] }>("/api/admin/beta/requests")
    ]);
    setSettings(settingsResult.settings); setRequests(requestsResult.items);
  }, []);
  useEffect(() => { void load().catch((error) => setState(errorMessage(error, "The admissions data could not be loaded."))); }, [load]);

  const visible = useMemo(() => requests.filter((item) =>
    (status === "ALL" || item.status === status) && matchesSearch(search, item.email, item.id)
  ), [requests, search, status]);

  async function patch(patchValue: Partial<Settings>): Promise<void> {
    try { const result = await apiFetch<{ settings: Settings }>("/api/admin/beta/settings", { method: "PATCH", body: patchValue }); setSettings(result.settings); setState("Saved. The change applies immediately and is recorded in the audit log."); }
    catch (error) { setState(errorMessage(error, "The setting could not be saved.")); }
  }
  async function act(id: string, action: "APPROVE" | "RESEND" | "RETURN_TO_WAITLIST" | "BLOCK"): Promise<void> {
    setState(`${humanise(action)} in progress…`);
    try {
      const result = await apiFetch<{ deliveryStatus?: "FAILED" | "SENT" }>(
        `/api/admin/beta/requests/${encodeURIComponent(id)}`,
        { method: "POST", body: { action } }
      );
      await load();
      setState(result.deliveryStatus === "FAILED"
        ? "The invitation is still valid, but the email did not go out. Use Resend when you are ready to issue a new link."
        : "Saved and recorded in the audit log.");
    }
    catch (error) { setState(errorMessage(error, "The action failed.")); }
  }

  return <section className="space-y-4"><h2 className="font-display text-xl font-bold text-fg">Admission controls</h2>{settings ? <Panel accent="red" eyebrow="Applies immediately"><div className="grid gap-3 sm:grid-cols-3"><Toggle checked={settings.waitlistOpen} label="Waitlist" onChange={(value) => void patch({ waitlistOpen: value })} /><Toggle checked={settings.invitationsOpen} label="Invitations" onChange={(value) => void patch({ invitationsOpen: value })} /><Toggle checked={settings.campaignsOpen} label="Campaigns" onChange={(value) => void patch({ campaignsOpen: value })} /></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><NumberSetting label="Total beta seats" onSave={(value) => void patch({ accountCap: value })} value={settings.accountCap} /><NumberSetting label="Approvals per 24 hours" onSave={(value) => void patch({ dailyApprovalLimit: value })} value={settings.dailyApprovalLimit} /></div></Panel> : null}<Panel accent="cyan" eyebrow="Access requests">

    <FilterBar>
      <SearchFilter label="Search" onChange={setSearch} placeholder="Email or reference" value={search} />
      <SelectFilter label="Status" onChange={setStatus} options={requestStatuses} value={status} />
      <ResultCount noun="request" shown={visible.length} total={requests.length} />
    </FilterBar>

    <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><caption className="sr-only">Access requests and the actions available on them</caption><thead className="label-caps text-outline"><tr><th className="p-2">Reference / applicant</th><th className="p-2">Status</th><th className="p-2">Requested</th><th className="p-2">Actions</th></tr></thead><tbody>{visible.map((item) => <tr className="border-t border-outline-dim/50" key={item.id}><td className="max-w-72 p-2"><span className="block break-all font-mono text-[11px] text-outline">{item.id}</span><span className="block break-all text-fg">{item.email}</span></td><td className="p-2 text-cyan">{humanise(item.status)}</td><td className="p-2 text-fg-muted">{new Date(item.requestedAt).toLocaleString()}</td><td className="flex flex-wrap gap-1 p-2">{(item.status === "PENDING" || item.status === "EXPIRED") ? <SmallAction label="Approve" onClick={() => void act(item.id, "APPROVE")} /> : null}{item.status === "INVITED" ? <SmallAction label="Resend" onClick={() => void act(item.id, "RESEND")} /> : null}{item.status !== "JOINED" && item.status !== "PENDING" ? <SmallAction label="Return to waitlist" onClick={() => void act(item.id, "RETURN_TO_WAITLIST")} /> : null}{item.status !== "JOINED" && item.status !== "BLOCKED" ? <SmallAction label="Block" onClick={() => void act(item.id, "BLOCK")} /> : null}</td></tr>)}</tbody></table>{requests.length === 0 ? <p className="p-4 text-outline">No access requests yet.</p> : null}{requests.length > 0 && visible.length === 0 ? <p className="p-4 text-outline">No request matches these filters.</p> : null}</div></Panel>{state ? <p className="text-sm text-outline" role="status">{state}</p> : null}</section>;
}

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange(value: boolean): void }): ReactNode { return <button aria-pressed={checked} className={`min-h-11 rounded border px-3 text-xs font-bold ${checked ? "border-green/60 text-green" : "border-red/60 text-red"}`} onClick={() => onChange(!checked)} type="button">{label}: {checked ? "OPEN" : "PAUSED"}</button>; }
function SmallAction({ label, onClick }: { label: string; onClick(): void }): ReactNode { return <button className="min-h-10 rounded border border-outline-dim px-2 text-[11px] text-fg hover:border-cyan" onClick={onClick} type="button">{label}</button>; }
function NumberSetting({ label, onSave, value }: { label: string; onSave(value: number): void; value: number }): ReactNode { const [draft, setDraft] = useState(String(value)); return <label><span className="label-caps text-outline">{label}</span><div className="mt-1 flex gap-2"><input className="min-h-11 min-w-0 flex-1 rounded border border-outline-dim bg-surface-low px-3 text-fg" min={1} onChange={(event) => setDraft(event.currentTarget.value)} type="number" value={draft} /><HudButton className="shrink-0" onClick={() => onSave(Number(draft))} variant="outline">SAVE</HudButton></div></label>; }
