"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { apiFetch, errorMessage } from "../../shared/api/client";
import { Panel } from "../../shared/ui/ui";

interface User { id: string; email: string; username: string; status: string; }

export function DeletionSupportPanel(): ReactNode {
  const [users, setUsers] = useState<User[]>([]); const [state, setState] = useState<string | null>(null);
  async function load(): Promise<void> { const result = await apiFetch<{ items: User[] }>("/api/admin/beta/users"); setUsers(result.items.filter((user) => user.status === "DELETION_PENDING")); }
  useEffect(() => { void load().catch((error) => setState(errorMessage(error, "Pending deletions could not be loaded."))); }, []);
  async function cancel(user: User): Promise<void> { if (!window.confirm(`Cancel deletion for ${user.username} (${user.email})? This action is audited.`)) return; try { await apiFetch(`/api/admin/users/${encodeURIComponent(user.id)}/deletion/cancel`, { method: "POST", body: {} }); await load(); setState("Deletion cancelled, account reactivated, and confirmation email requested."); } catch (error) { setState(errorMessage(error, "Deletion cancellation failed.")); } }
  return <Panel accent="red" eyebrow="SUPPORT_DELETION_CANCELLATION"><p className="mb-3 text-xs text-fg-muted">Use only after authenticating an urgent support request before the deadline. Every action is audited.</p>{users.map((user) => <div className="flex flex-wrap items-center justify-between gap-2 border-t border-outline-dim/50 py-2" key={user.id}><span className="text-sm text-fg">{user.username} · {user.email}</span><button className="min-h-11 rounded border border-red/50 px-3 text-xs text-red" onClick={() => void cancel(user)} type="button">CANCEL DELETION</button></div>)}{users.length === 0 ? <p className="text-sm text-outline">No accounts are pending deletion.</p> : null}{state ? <p className="mt-2 text-xs text-outline" role="status">{state}</p> : null}</Panel>;
}
