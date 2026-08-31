"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { apiFetch, errorMessage } from "../../shared/api/client";
import { HudButton, Panel } from "../../shared/ui/ui";
import { FilterBar, ResultCount, SearchFilter, SelectFilter, humanise, matchesSearch } from "./admin-filters";
import type { AdminAuditEvent } from "./admin-types";

interface AuditPage { items: AdminAuditEvent[]; nextCursor: string | null; }

export function AuditAdminPanel(): ReactNode {
  const [items, setItems] = useState<AdminAuditEvent[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("ALL");
  const [targetType, setTargetType] = useState("ALL");
  const load = useCallback(async (cursor?: string) => {
    setIsLoading(true);
    try {
      const query = cursor ? `?limit=50&cursor=${encodeURIComponent(cursor)}` : "?limit=50";
      const page = await apiFetch<AuditPage>(`/api/admin/audit-events${query}`);
      setItems((current) => cursor ? [...current, ...page.items] : page.items);
      setNextCursor(page.nextCursor);
      setNotice(null);
    } catch (error) {
      setNotice(errorMessage(error, "The audit log could not be loaded."));
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  // The filter choices come from the events actually loaded, so the drop-downs
  // never offer a value that would return nothing.
  const actions = useMemo(() => uniqueSorted(items.map((item) => item.action)), [items]);
  const targetTypes = useMemo(() => uniqueSorted(items.map((item) => item.targetType)), [items]);
  const visible = useMemo(() => items.filter((item) =>
    (action === "ALL" || item.action === action)
    && (targetType === "ALL" || item.targetType === targetType)
    && matchesSearch(search, item.adminUsername, item.action, item.targetId, formatDetails(item.details))
  ), [action, items, search, targetType]);

  return <section className="space-y-4"><h2 className="font-display text-xl font-bold text-fg">Audit log</h2><Panel accent="cyan" eyebrow="Privileged actions, newest first">

    <FilterBar>
      <SearchFilter label="Search" onChange={setSearch} placeholder="Administrator, target, or detail" value={search} />
      <SelectFilter label="Action" onChange={setAction} options={actions} value={action} />
      <SelectFilter label="Target" onChange={setTargetType} options={targetTypes} value={targetType} />
      <ResultCount noun="event" shown={visible.length} total={items.length} />
    </FilterBar>

    <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><caption className="sr-only">Recent privileged actions</caption><thead className="label-caps text-outline"><tr><th className="p-2">When / who</th><th className="p-2">Action</th><th className="p-2">Target</th><th className="p-2">Details</th></tr></thead><tbody>{visible.map((item) => <tr className="border-t border-outline-dim/50" key={item.id}><td className="p-2"><span className="block text-xs text-fg">{new Date(item.createdAt).toLocaleString()}</span><span className="block break-words text-[11px] text-outline">{item.adminUsername ?? "System"}</span></td><td className="p-2 font-mono text-xs text-cyan">{item.action}</td><td className="max-w-64 p-2"><span className="block text-xs text-fg">{humanise(item.targetType)}</span><span className="block break-all font-mono text-[11px] text-outline">{item.targetId}</span></td><td className="max-w-80 p-2 text-xs text-fg-muted"><span className="block break-words">{formatDetails(item.details)}</span></td></tr>)}</tbody></table>{items.length === 0 && !isLoading ? <p className="p-4 text-outline">No audit events yet.</p> : null}{items.length > 0 && visible.length === 0 ? <p className="p-4 text-outline">No event matches these filters.</p> : null}</div>{nextCursor ? <div className="mt-4"><HudButton disabled={isLoading} onClick={() => void load(nextCursor)} variant="outline">{isLoading ? "LOADING…" : "LOAD OLDER EVENTS"}</HudButton></div> : null}</Panel>{notice ? <p className="text-sm text-outline" role="status">{notice}</p> : null}</section>;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function formatDetails(details: Record<string, string | number>): string {
  const entries = Object.entries(details);
  return entries.length > 0 ? entries.map(([key, value]) => `${key}: ${value}`).join(" · ") : "—";
}
