"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { apiFetch, errorMessage } from "../../shared/api/client";
import { formatTimestamp } from "../../shared/format";
import { ConfirmDialog } from "../../shared/ui/confirm-dialog";
import { AdminPanel, FilterBar, ResultCount, SearchFilter, SelectFilter, humanise, matchesSearch } from "./admin-filters";
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
    void load().catch((error) => setNotice(errorMessage(error, "Couldn't load the member list. Reload the page to try again.")));
  }, [load]);

  const visible = useMemo(() => users.filter((user) =>
    (role === "ALL" || user.role === role)
    && (status === "ALL" || user.status === status)
    && matchesSearch(search, user.username, user.email)
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
      setNotice(errorMessage(error, "Couldn't complete the action. Try again."));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <section className="space-y-4">
      <h2 className=" text-title-2 text-text">Member accounts</h2>
      <AdminPanel title="Account and session controls">
        <p className="mb-3 text-footnote   text-text-secondary">Suspending an account signs it out everywhere. Reactivating never signs the member back in and never changes their email verification. Administrator accounts cannot be changed here.</p>

        <FilterBar>
          <SearchFilter label="Search" onChange={setSearch} placeholder="Username or email" value={search} />
          <SelectFilter label="Role" onChange={setRole} options={roles} value={role} />
          <SelectFilter label="Status" onChange={setStatus} options={statuses} value={status} />
          <ResultCount noun="account" shown={visible.length} total={users.length} />
        </FilterBar>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-callout">
            <caption className="sr-only">Member accounts and the actions available on them</caption>
            <thead className="text-subhead text-text-secondary"><tr><th className="p-2">Member</th><th className="p-2">Role and status</th><th className="p-2">Sessions</th><th className="p-2">Joined</th><th className="p-2">Actions</th></tr></thead>
            <tbody>{visible.map((user) => <UserRow key={user.id} onAction={(action) => setConfirmation({ action, user })} user={user} />)}</tbody>
          </table>
          {users.length === 0 ? <p className="p-4 text-text-muted">No member accounts yet.</p> : null}
          {users.length > 0 && visible.length === 0 ? <p className="p-4 text-text-muted">No account matches these filters.</p> : null}
        </div>
      </AdminPanel>
      {notice ? <p className="text-callout text-text-muted" role="status">{notice}</p> : null}
      <ConfirmDialog
        confirmLabel={confirmation ? actionLabel(confirmation.action) : "Confirm"}
        isOpen={confirmation !== null}
        isPending={isPending}
        message={confirmation ? confirmationMessage(confirmation) : ""}
        onCancel={() => { if (!isPending) setConfirmation(null); }}
        onConfirm={() => void applyAction()}
        pendingLabel="Applying…"
        title={confirmation ? `${actionLabel(confirmation.action)} ${confirmation.user.username}?` : "Confirm action"}
        tone={confirmation?.action === "SUSPEND" ? "danger" : "warning"}
      />
    </section>
  );
}

function UserRow({ onAction, user }: { onAction(action: ContainmentAction): void; user: AdminUser }): ReactNode {
  const protectedAccount = user.role === "ADMIN";
  return <tr className="border-t border-line"><td className="max-w-64 p-2"><span className="block break-words font-medium text-text">{user.username}</span><span className="block break-all text-footnote text-text-secondary">{user.email}</span></td><td className="p-2"><span className="block text-warning">{humanise(user.role)}</span><span className="text-footnote text-text-muted">{humanise(user.status)}</span></td><td className="p-2 text-text">{user.activeSessionCount} active</td><td className="p-2 text-footnote text-text-secondary">{formatTimestamp(user.createdAt)}</td><td className="p-2">{protectedAccount ? <span className="text-footnote text-text-muted">Protected administrator</span> : <div className="flex flex-wrap gap-1">{user.status === "ACTIVE" ? <ActionButton label="Suspend" onClick={() => onAction("SUSPEND")} tone="danger" /> : null}{user.status === "SUSPENDED" ? <ActionButton label="Reactivate" onClick={() => onAction("REACTIVATE")} /> : null}<ActionButton label="Sign out everywhere" onClick={() => onAction("REVOKE_SESSIONS")} />{user.status === "DELETION_PENDING" ? <span className="self-center text-footnote text-text-muted">Use the deletion panel to change this status</span> : null}</div>}</td></tr>;
}

function ActionButton({ label, onClick, tone = "normal" }: { label: string; onClick(): void; tone?: "danger" | "normal" }): ReactNode {
  return <button className={`min-h-11 rounded-[var(--radius-control)] px-3 text-callout ${tone === "danger" ? "bg-surface-raised text-danger" : "bg-surface-raised text-accent"}`} onClick={onClick} type="button">{label}</button>;
}

function statusUrl(userId: string): string { return `/api/admin/users/${encodeURIComponent(userId)}/status`; }
function sessionUrl(userId: string): string { return `/api/admin/users/${encodeURIComponent(userId)}/sessions/revoke`; }
function actionLabel(action: ContainmentAction): string { return action === "SUSPEND" ? "Suspend" : action === "REACTIVATE" ? "Reactivate" : "Sign out everywhere"; }
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
