"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { apiFetch, errorMessage } from "../../shared/api/client";
import { ConfirmDialog } from "../../shared/ui/confirm-dialog";
import { AdminPanel } from "./admin-filters";
import type { AdminUser } from "./admin-types";

export function DeletionSupportPanel(): ReactNode {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [state, setState] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function load(): Promise<void> {
    const result = await apiFetch<{ items: AdminUser[] }>("/api/admin/users");
    setUsers(result.items.filter((user) => user.role === "USER" && user.status === "DELETION_PENDING"));
  }
  useEffect(() => {
    void load().catch((error) => setState(errorMessage(error, "Scheduled deletions could not be loaded.")));
  }, []);

  async function cancel(): Promise<void> {
    if (!selected) return;
    setIsPending(true);
    try {
      const result = await apiFetch<{ notificationStatus: "FAILED" | "SENT" }>(`/api/admin/users/${encodeURIComponent(selected.id)}/deletion/cancel`, {
        method: "POST", body: {}
      });
      await load();
      setState(result.notificationStatus === "SENT"
        ? "Deletion stopped, the account is active again, and the confirmation email was accepted."
        : "Deletion stopped and the account is active again, but the confirmation email did not go out. The cancellation itself needs no retry.");
      setSelected(null);
    } catch (error) {
      setState(errorMessage(error, "The deletion could not be stopped."));
    } finally {
      setIsPending(false);
    }
  }

  return <><AdminPanel title="Scheduled deletions"><p className="mb-3 text-footnote text-text-secondary">Stop a scheduled deletion only after you have verified an urgent support request, and only before the deadline. Every action is recorded in the audit log.</p>{users.map((user) => <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line py-2" key={user.id}><span className="min-w-0 flex-1 break-all text-callout text-text">{user.username}, {user.email}</span><button className="min-h-11 shrink-0 rounded-[var(--radius-control)] bg-surface-raised px-3 text-callout text-danger" onClick={() => setSelected(user)} type="button">Stop deletion</button></div>)}{users.length === 0 ? <p className="text-callout text-text-muted">No account is scheduled for deletion.</p> : null}{state ? <p className="mt-2 text-footnote text-text-muted" role="status">{state}</p> : null}</AdminPanel><ConfirmDialog confirmLabel="Stop deletion" isOpen={selected !== null} isPending={isPending} message={selected ? `Stop the scheduled deletion for ${selected.username} (${selected.email})? The account becomes active again, but they are not signed in. This action is recorded in the audit log.` : ""} onCancel={() => { if (!isPending) setSelected(null); }} onConfirm={() => void cancel()} pendingLabel="Stopping…" title="Stop this scheduled deletion?" tone="warning" /></>;
}
