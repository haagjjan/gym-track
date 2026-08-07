"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { apiFetch, errorMessage } from "../../shared/api/client";
import { ConfirmDialog } from "../../shared/ui/confirm-dialog";
import { Panel } from "../../shared/ui/ui";
import type { AdminUser } from "./admin-types";

type ContainmentAction = "SUSPEND" | "REACTIVATE" | "REVOKE_SESSIONS";
interface PendingAction { action: ContainmentAction; user: AdminUser; }

export function UserAdminPanel(): ReactNode {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<PendingAction | null>(null);
  const [isPending, setIsPending] = useState(false);
  const load = useCallback(async () => {
    const result = await apiFetch<{ items: AdminUser[] }>("/api/admin/users");
    setUsers(result.items);
  }, []);
  useEffect(() => {
    void load().catch((error) => setNotice(errorMessage(error, "User containment data could not be loaded.")));
  }, [load]);

  async function applyAction(): Promise<void> {
    if (!confirmation) return;
    setIsPending(true);
    try {
      const result = confirmation.action === "REVOKE_SESSIONS"
        ? await apiFetch<{ revokedSessions: number }>(sessionUrl(confirmation.user.id), { method: "POST", body: {} })
        : await apiFetch<{ revokedSessions: number }>(statusUrl(confirmation.user.id), {
            method: "PATCH",
            body: { status: confirmation.action === "SUSPEND" ? "SUSPENDED" : "ACTIVE" }
          });
      await load();
      setNotice(successMessage(confirmation, result.revokedSessions));
      setConfirmation(null);
    } catch (error) {
      setNotice(errorMessage(error, "The containment action failed."));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="font-display text-xl font-bold text-fg">User containment</h2>
      <Panel accent="red" eyebrow="ACCOUNT_AND_SESSION_CONTROLS">
        <p className="mb-3 text-xs leading-5 text-fg-muted">Suspension revokes all sessions. Reactivation never signs the user in or changes email verification. Administrator accounts are protected.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <caption className="sr-only">Beta user accounts and containment actions</caption>
            <thead className="label-caps text-outline"><tr><th className="p-2">User</th><th className="p-2">Role / status</th><th className="p-2">Sessions</th><th className="p-2">Created</th><th className="p-2">Actions</th></tr></thead>
            <tbody>{users.map((user) => <UserRow key={user.id} onAction={(action) => setConfirmation({ action, user })} user={user} />)}</tbody>
          </table>
          {users.length === 0 ? <p className="p-4 text-outline">No user accounts found.</p> : null}
        </div>
      </Panel>
      {notice ? <p className="text-sm text-outline" role="status">{notice}</p> : null}
      <ConfirmDialog
        confirmLabel={confirmation ? actionLabel(confirmation.action) : "CONFIRM"}
        isOpen={confirmation !== null}
        isPending={isPending}
        message={confirmation ? confirmationMessage(confirmation) : ""}
        onCancel={() => { if (!isPending) setConfirmation(null); }}
        onConfirm={() => void applyAction()}
        pendingLabel="APPLYING…"
        title={confirmation ? `${actionLabel(confirmation.action)} ${confirmation.user.username}?` : "Confirm action"}
        tone={confirmation?.action === "SUSPEND" ? "danger" : "warning"}
      />
    </section>
  );
}

function UserRow({ onAction, user }: { onAction(action: ContainmentAction): void; user: AdminUser }): ReactNode {
  const protectedAccount = user.role === "ADMIN";
  return <tr className="border-t border-outline-dim/50"><td className="p-2"><span className="block font-medium text-fg">{user.username}</span><span className="text-xs text-fg-muted">{user.email}</span></td><td className="p-2"><span className="block text-lavender">{user.role}</span><span className="text-xs text-outline">{user.status}</span></td><td className="p-2 text-fg">{user.activeSessionCount} active</td><td className="p-2 text-xs text-fg-muted">{new Date(user.createdAt).toLocaleString()}</td><td className="p-2">{protectedAccount ? <span className="text-xs text-outline">Protected administrator</span> : <div className="flex flex-wrap gap-1">{user.status === "ACTIVE" ? <ActionButton label="Suspend" onClick={() => onAction("SUSPEND")} tone="danger" /> : null}{user.status === "SUSPENDED" ? <ActionButton label="Reactivate" onClick={() => onAction("REACTIVATE")} /> : null}<ActionButton label="Revoke sessions" onClick={() => onAction("REVOKE_SESSIONS")} />{user.status === "DELETION_PENDING" ? <span className="self-center text-xs text-outline">Use deletion support to change status</span> : null}</div>}</td></tr>;
}

function ActionButton({ label, onClick, tone = "normal" }: { label: string; onClick(): void; tone?: "danger" | "normal" }): ReactNode {
  return <button className={`min-h-11 rounded border px-3 text-xs ${tone === "danger" ? "border-red/50 text-red" : "border-cyan/50 text-cyan"}`} onClick={onClick} type="button">{label}</button>;
}

function statusUrl(userId: string): string { return `/api/admin/users/${encodeURIComponent(userId)}/status`; }
function sessionUrl(userId: string): string { return `/api/admin/users/${encodeURIComponent(userId)}/sessions/revoke`; }
function actionLabel(action: ContainmentAction): string { return action === "SUSPEND" ? "SUSPEND" : action === "REACTIVATE" ? "REACTIVATE" : "REVOKE SESSIONS"; }
function confirmationMessage(input: PendingAction): string {
  if (input.action === "SUSPEND") return `Suspend ${input.user.username} and immediately revoke every session? This action is audited.`;
  if (input.action === "REACTIVATE") return `Reactivate ${input.user.username}? They must sign in again. This action is audited.`;
  return `Revoke every session for ${input.user.username}? Their account status will not change. This action is audited.`;
}
function successMessage(input: PendingAction, count: number): string {
  if (input.action === "SUSPEND") return `${input.user.username} suspended; ${count} session${count === 1 ? "" : "s"} revoked.`;
  if (input.action === "REACTIVATE") return `${input.user.username} reactivated without creating a session.`;
  return `${count} session${count === 1 ? "" : "s"} revoked for ${input.user.username}.`;
}
