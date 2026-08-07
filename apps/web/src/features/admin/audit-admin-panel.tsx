"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { apiFetch, errorMessage } from "../../shared/api/client";
import { HudButton, Panel } from "../../shared/ui/ui";
import type { AdminAuditEvent } from "./admin-types";

interface AuditPage { items: AdminAuditEvent[]; nextCursor: string | null; }

export function AuditAdminPanel(): ReactNode {
  const [items, setItems] = useState<AdminAuditEvent[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const load = useCallback(async (cursor?: string) => {
    setIsLoading(true);
    try {
      const query = cursor ? `?limit=50&cursor=${encodeURIComponent(cursor)}` : "?limit=50";
      const page = await apiFetch<AuditPage>(`/api/admin/audit-events${query}`);
      setItems((current) => cursor ? [...current, ...page.items] : page.items);
      setNextCursor(page.nextCursor);
      setNotice(null);
    } catch (error) {
      setNotice(errorMessage(error, "Administrator audit events could not be loaded."));
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return <section className="space-y-4"><h2 className="font-display text-xl font-bold text-fg">Administrator audit trail</h2><Panel accent="cyan" eyebrow="RECENT_PRIVILEGED_ACTIONS"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><caption className="sr-only">Recent administrator audit events</caption><thead className="label-caps text-outline"><tr><th className="p-2">Time / operator</th><th className="p-2">Action</th><th className="p-2">Target</th><th className="p-2">Bounded details</th></tr></thead><tbody>{items.map((item) => <tr className="border-t border-outline-dim/50" key={item.id}><td className="p-2"><span className="block text-xs text-fg">{new Date(item.createdAt).toLocaleString()}</span><span className="text-[11px] text-outline">{item.adminUsername ?? "operator/system"}</span></td><td className="p-2 font-mono text-xs text-cyan">{item.action}</td><td className="p-2"><span className="block text-xs text-fg">{item.targetType}</span><span className="font-mono text-[11px] text-outline">{item.targetId}</span></td><td className="p-2 text-xs text-fg-muted">{formatDetails(item.details)}</td></tr>)}</tbody></table>{items.length === 0 && !isLoading ? <p className="p-4 text-outline">No audit events found.</p> : null}</div>{nextCursor ? <div className="mt-4"><HudButton disabled={isLoading} onClick={() => void load(nextCursor)} variant="outline">{isLoading ? "LOADING…" : "LOAD OLDER EVENTS"}</HudButton></div> : null}</Panel>{notice ? <p className="text-sm text-outline" role="status">{notice}</p> : null}</section>;
}

function formatDetails(details: Record<string, string | number>): string {
  const entries = Object.entries(details);
  return entries.length > 0 ? entries.map(([key, value]) => `${key}: ${value}`).join(" · ") : "—";
}
