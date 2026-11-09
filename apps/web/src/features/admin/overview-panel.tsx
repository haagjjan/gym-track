"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { apiFetch, errorMessage } from "../../shared/api/client";
import { formatDate, formatTimestamp } from "../../shared/format";
import { AdminPanel, FilterBar, ResultCount, SearchFilter, humanise, matchesSearch } from "./admin-filters";
import type { AdminOverview, AdminUser } from "./admin-types";

const sortOptions = [
  { value: "LAST_ACTIVE", label: "Last active" },
  { value: "NEWEST", label: "Newest" },
  { value: "MOST_WORKOUTS", label: "Most workouts" }
] as const;
type SortOption = (typeof sortOptions)[number]["value"];

/**
 * Usage at a glance: exact counts plus every account with its activity, so the
 * owner can see how the app is used without opening production logs.
 */
export function OverviewPanel(): ReactNode {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("LAST_ACTIVE");

  const load = useCallback(async () => {
    const [counts, list] = await Promise.all([
      apiFetch<AdminOverview>("/api/admin/overview"),
      apiFetch<{ items: AdminUser[] }>("/api/admin/users")
    ]);
    setOverview(counts);
    setUsers(list.items);
  }, []);

  useEffect(() => {
    void load().catch((error) => setNotice(errorMessage(error, "Couldn't load the overview. Try Refresh.")));
  }, [load]);

  const visible = useMemo(() => users
    .filter((user) => matchesSearch(search, user.username, user.email))
    .sort((a, b) => compareUsers(a, b, sort)), [search, sort, users]);

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className=" text-title-2 text-text">Overview</h2>
        <div className="flex items-center gap-3 text-footnote text-text-muted">
          {overview ? <span>Updated {formatTimestamp(overview.generatedAt)}</span> : null}
          <button className="min-h-11 rounded-[var(--radius-control)] bg-surface-raised px-3 text-callout text-accent" onClick={() => void load().catch((error) => setNotice(errorMessage(error, "Couldn't load the overview. Try Refresh.")))} type="button">Refresh</button>
        </div>
      </div>

      {overview ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Accounts" value={overview.totalAccounts} detail={`${overview.activeAccounts} active, ${overview.suspendedAccounts} suspended, ${overview.deletionPendingAccounts} pending deletion`} />
          <Stat label="New sign-ups" value={overview.signupsLast7Days} detail={`Last 7 days, ${overview.signupsLast30Days} in the last 30 days`} />
          <Stat label="Active users" value={overview.activeUsersLast7Days} detail={`used the app in the last 7 days, ${overview.activeUsersLast30Days} in the last 30 days`} />
          <Stat label="Unverified emails" value={overview.unverifiedEmails} detail={`${overview.activeSessions} signed-in sessions right now`} />
          <Stat label="Workouts finished" value={overview.workoutsCompletedLast7Days} detail={`Last 7 days, ${overview.workoutsCompletedTotal} in total`} />
          <Stat label="Sets logged" value={overview.setsLoggedLast7Days} detail="last 7 days" />
        </div>
      ) : null}

      <AdminPanel title="All accounts">
        <FilterBar>
          <SearchFilter label="Search" onChange={setSearch} placeholder="Username or email" value={search} />
          <SortSelect onChange={setSort} value={sort} />
          <ResultCount noun="account" shown={visible.length} total={overview?.totalAccounts ?? users.length} />
        </FilterBar>
        {overview && users.length < overview.totalAccounts ? (
          <p className="mt-2 text-footnote text-warning">The list holds the newest {users.length} of {overview.totalAccounts} accounts. Older accounts are counted above but not listed yet.</p>
        ) : null}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-callout">
            <caption className="sr-only">Every account with its activity</caption>
            <thead className="text-subhead text-text-secondary">
              <tr><th className="p-2">Account</th><th className="p-2">Status</th><th className="p-2">Email</th><th className="p-2">Joined</th><th className="p-2">Last active</th><th className="p-2">Workouts</th><th className="p-2">Last workout</th></tr>
            </thead>
            <tbody>
              {visible.map((user) => (
                <tr className="border-t border-line" key={user.id}>
                  <td className="max-w-64 p-2"><span className="block break-words font-medium text-text">{user.username}</span><span className="block break-all text-footnote text-text-secondary">{user.email}</span></td>
                  <td className="p-2 text-footnote"><span className="block text-text">{humanise(user.status)}</span>{user.role === "ADMIN" ? <span className="text-warning">Admin</span> : null}</td>
                  <td className="p-2 text-footnote">{user.emailVerified ? <span className="text-text-secondary">Verified</span> : <span className="text-warning">Not verified</span>}</td>
                  <td className="p-2 text-footnote text-text-secondary">{formatOptionalDate(user.createdAt)}</td>
                  <td className="p-2 text-footnote text-text-secondary">{formatOptionalDate(user.lastActiveAt)}</td>
                  <td className="p-2 text-text">{user.completedWorkoutCount}</td>
                  <td className="p-2 text-footnote text-text-secondary">{formatOptionalDate(user.lastWorkoutAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 ? <p className="p-4 text-text-muted">No accounts yet.</p> : null}
        </div>
      </AdminPanel>
      {notice ? <p className="text-callout text-text-muted" role="status">{notice}</p> : null}
    </section>
  );
}

function SortSelect({ onChange, value }: { onChange(value: SortOption): void; value: SortOption }): ReactNode {
  const id = useId();
  return (
    <div className="min-w-0 basis-40">
      <label className="block text-subhead text-text-secondary" htmlFor={id}>Sort by</label>
      <select
        className="mt-1 min-h-11 w-full min-w-0 rounded-[var(--radius-control)] border border-control-line bg-surface-raised px-2 text-callout text-text focus:border-accent focus:outline-none"
        id={id}
        onChange={(event) => onChange(event.currentTarget.value as SortOption)}
        value={value}
      >
        {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
  );
}

function Stat({ detail, label, value }: { detail: string; label: string; value: number }): ReactNode {
  return (
    <div className="rounded-[var(--radius-card)] bg-surface p-4">
      <p className="text-footnote text-text-secondary">{label}</p>
      <p className="mt-1 text-title-1 num text-text">{value}</p>
      <p className="mt-1 text-footnote   text-text-muted">{detail}</p>
    </div>
  );
}

function formatOptionalDate(value: string | null): string {
  return value ? formatDate(value) : "Never";
}

function timeOf(value: string | null): number {
  return value ? new Date(value).getTime() : 0;
}

function compareUsers(a: AdminUser, b: AdminUser, sort: SortOption): number {
  if (sort === "NEWEST") return timeOf(b.createdAt) - timeOf(a.createdAt);
  if (sort === "MOST_WORKOUTS") return b.completedWorkoutCount - a.completedWorkoutCount;
  return timeOf(b.lastActiveAt) - timeOf(a.lastActiveAt);
}
