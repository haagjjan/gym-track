"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { apiFetch, errorMessage } from "../../shared/api/client";
import { ConfirmDialog } from "../../shared/ui/confirm-dialog";
import { Panel } from "../../shared/ui/ui";
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
    void load().catch((error) => setState(errorMessage(error, "Pending deletions could not be loaded.")));
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
        ? "Deletion cancelled, account reactivated, and confirmation email accepted."
        : "Deletion cancelled and account reactivated, but the confirmation email failed. No retry is required for the cancellation.");
      setSelected(null);
    } catch (error) {
      setState(errorMessage(error, "Deletion cancellation failed."));
    } finally {
      setIsPending(false);
    }
  }

  return <><Panel accent="red" eyebrow="SUPPORT_DELETION_CANCELLATION"><p className="mb-3 text-xs text-fg-muted">Use only after authenticating an urgent support request before the deadline. Every action is audited.</p>{users.map((user) => <div className="flex flex-wrap items-center justify-between gap-2 border-t border-outline-dim/50 py-2" key={user.id}><span className="text-sm text-fg">{user.username} · {user.email}</span><button className="min-h-11 rounded border border-red/50 px-3 text-xs text-red" onClick={() => setSelected(user)} type="button">CANCEL DELETION</button></div>)}{users.length === 0 ? <p className="text-sm text-outline">No accounts are pending deletion.</p> : null}{state ? <p className="mt-2 text-xs text-outline" role="status">{state}</p> : null}</Panel><ConfirmDialog confirmLabel="CANCEL DELETION" isOpen={selected !== null} isPending={isPending} message={selected ? `Cancel deletion for ${selected.username} (${selected.email})? The account becomes active, but no session is created. This action is audited.` : ""} onCancel={() => { if (!isPending) setSelected(null); }} onConfirm={() => void cancel()} pendingLabel="CANCELLING…" title="Cancel scheduled deletion?" tone="warning" /></>;
}
