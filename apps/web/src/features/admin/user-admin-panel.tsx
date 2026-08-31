"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { apiFetch, errorMessage } from "../../shared/api/client";
import { ConfirmDialog } from "../../shared/ui/confirm-dialog";
import { Panel } from "../../shared/ui/ui";
import { FilterBar, ResultCount, SearchFilter, SelectFilter, humanise, matchesSearch } from "./admin-filters";
import type { AdminUser } from "./admin-types";

type ContainmentAction = "SUSPEND" | "REACTIVATE" | "REVOKE_SESSIONS";
interface PendingAction { action: ContainmentAction; user: AdminUser; }

const roles = ["USER", "ADMIN"] as const;
const statuses = ["ACTIVE", "SUSPENDED", "DELETION_PENDING"] as const;

export function UserAdminPanel(): ReactNode {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<PendingAction | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const load = useCallback(async () => {
    const result = await apiFetch<{ items: AdminUser[] }>("/api/admin/users");
    setUsers(result.items);
  }, []);
  useEffect(() => {
    void load().catch((error) => setNotice(errorMessage(error, "The member list could not be loaded.")));
  }, [load]);

  const visible = useMemo(() => users.filter((user) =>
    (role === "ALL" || user.role === role)
    && (status === "ALL" || user.status === status)
    && matchesSearch(search, user.username, user.email, user.cohort)
  ), [role, search, status, users]);

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
      setNotice(errorMessage(error, "The action failed."));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="font-display text-xl font-bold text-fg">Member accounts</h2>
      <Panel accent="red" eyebrow="Account and session controls">
        <p className="mb-3 text-xs leading-5 text-fg-muted">Suspending an account signs it out everywhere. Reactivating never signs the member back in and never changes their email verification. Administrator accounts cannot be changed here.</p>

        <FilterBar>
          <SearchFilter label="Search" onChange={setSearch} placeholder="Username, email, or cohort" value={search} />
          <SelectFilter label="Role" onChange={setRole} options={roles} value={role} />
          <SelectFilter label="Status" onChange={setStatus} options={statuses} value={status} />
          <ResultCount noun="account" shown={visible.length} total={users.length} />
        </FilterBar>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <caption className="sr-only">Member accounts and the actions available on them</caption>
            <thead className="label-caps text-outline"><tr><th className="p-2">Member</th><th className="p-2">Role / status</th><th className="p-2">Sessions</th><th className="p-2">Joined</th><th className="p-2">Actions</th></tr></thead>
            <tbody>{visible.map((user) => <UserRow key={user.id} onAction={(action) => setConfirmation({ action, user })} user={user} />)}</tbody>
          </table>
          {users.length === 0 ? <p className="p-4 text-outline">No member accounts yet.</p> : null}
          {users.length > 0 && visible.length === 0 ? <p className="p-4 text-outline">No account matches these filters.</p> : null}
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
  return <tr className="border-t border-outline-dim/50"><td className="max-w-64 p-2"><span className="block break-words font-medium text-fg">{user.username}</span><span className="block break-all text-xs text-fg-muted">{user.email}</span></td><td className="p-2"><span className="block text-lavender">{humanise(user.role)}</span><span className="text-xs text-outline">{humanise(user.status)}</span></td><td className="p-2 text-fg">{user.activeSessionCount} active</td><td className="p-2 text-xs text-fg-muted">{new Date(user.createdAt).toLocaleString()}</td><td className="p-2">{protectedAccount ? <span className="text-xs text-outline">Protected administrator</span> : <div className="flex flex-wrap gap-1">{user.status === "ACTIVE" ? <ActionButton label="Suspend" onClick={() => onAction("SUSPEND")} tone="danger" /> : null}{user.status === "SUSPENDED" ? <ActionButton label="Reactivate" onClick={() => onAction("REACTIVATE")} /> : null}<ActionButton label="Sign out everywhere" onClick={() => onAction("REVOKE_SESSIONS")} />{user.status === "DELETION_PENDING" ? <span className="self-center text-xs text-outline">Use the deletion panel to change this status</span> : null}</div>}</td></tr>;
}

function ActionButton({ label, onClick, tone = "normal" }: { label: string; onClick(): void; tone?: "danger" | "normal" }): ReactNode {
  return <button className={`min-h-11 rounded border px-3 text-xs ${tone === "danger" ? "border-red/50 text-red" : "border-cyan/50 text-cyan"}`} onClick={onClick} type="button">{label}</button>;
}

function statusUrl(userId: string): string { return `/api/admin/users/${encodeURIComponent(userId)}/status`; }
function sessionUrl(userId: string): string { return `/api/admin/users/${encodeURIComponent(userId)}/sessions/revoke`; }
function actionLabel(action: ContainmentAction): string { return action === "SUSPEND" ? "SUSPEND" : action === "REACTIVATE" ? "REACTIVATE" : "SIGN OUT EVERYWHERE"; }
function confirmationMessage(input: PendingAction): string {
  if (input.action === "SUSPEND") return `Suspend ${input.user.username} and sign them out of every device right now? This action is recorded in the audit log.`;
  if (input.action === "REACTIVATE") return `Reactivate ${input.user.username}? They will have to sign in again. This action is recorded in the audit log.`;
  return `Sign ${input.user.username} out of every device? Their account status stays the same. This action is recorded in the audit log.`;
}
function successMessage(input: PendingAction, count: number): string {
  if (input.action === "SUSPEND") return `${input.user.username} suspended; ${count} session${count === 1 ? "" : "s"} ended.`;
  if (input.action === "REACTIVATE") return `${input.user.username} reactivated. They were not signed in.`;
  return `${count} session${count === 1 ? "" : "s"} ended for ${input.user.username}.`;
}
