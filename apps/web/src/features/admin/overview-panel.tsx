"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { apiFetch, errorMessage } from "../../shared/api/client";
import { Panel } from "../../shared/ui/ui";
import { FilterBar, ResultCount, SearchFilter, humanise, matchesSearch } from "./admin-filters";
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
    void load().catch((error) => setNotice(errorMessage(error, "The overview could not be loaded.")));
  }, [load]);

  const visible = useMemo(() => users
    .filter((user) => matchesSearch(search, user.username, user.email))
    .sort((a, b) => compareUsers(a, b, sort)), [search, sort, users]);

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-bold text-fg">Overview</h2>
        <div className="flex items-center gap-3 text-xs text-outline">
          {overview ? <span>Updated {new Date(overview.generatedAt).toLocaleString()}</span> : null}
          <button className="min-h-11 rounded border border-cyan/50 px-3 text-cyan" onClick={() => void load().catch((error) => setNotice(errorMessage(error, "The overview could not be loaded.")))} type="button">Refresh</button>
        </div>
      </div>

      {overview ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Accounts" value={overview.totalAccounts} detail={`${overview.activeAccounts} active · ${overview.suspendedAccounts} suspended · ${overview.deletionPendingAccounts} pending deletion`} />
          <Stat label="New sign-ups" value={overview.signupsLast7Days} detail={`last 7 days · ${overview.signupsLast30Days} in the last 30 days`} />
          <Stat label="Active users" value={overview.activeUsersLast7Days} detail={`used the app in the last 7 days · ${overview.activeUsersLast30Days} in the last 30 days`} />
          <Stat label="Unverified emails" value={overview.unverifiedEmails} detail={`${overview.activeSessions} signed-in sessions right now`} />
          <Stat label="Workouts finished" value={overview.workoutsCompletedLast7Days} detail={`last 7 days · ${overview.workoutsCompletedTotal} in total`} />
          <Stat label="Sets logged" value={overview.setsLoggedLast7Days} detail="last 7 days" />
        </div>
      ) : null}

      <Panel accent="cyan" eyebrow="All accounts">
        <FilterBar>
          <SearchFilter label="Search" onChange={setSearch} placeholder="Username or email" value={search} />
          <SortSelect onChange={setSort} value={sort} />
          <ResultCount noun="account" shown={visible.length} total={overview?.totalAccounts ?? users.length} />
        </FilterBar>
        {overview && users.length < overview.totalAccounts ? (
          <p className="mt-2 text-xs text-lavender">The list holds the newest {users.length} of {overview.totalAccounts} accounts. Older accounts are counted above but not listed yet.</p>
        ) : null}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <caption className="sr-only">Every account with its activity</caption>
            <thead className="label-caps text-outline">
              <tr><th className="p-2">Account</th><th className="p-2">Status</th><th className="p-2">Email</th><th className="p-2">Joined</th><th className="p-2">Last active</th><th className="p-2">Workouts</th><th className="p-2">Last workout</th></tr>
            </thead>
            <tbody>
              {visible.map((user) => (
                <tr className="border-t border-outline-dim/50" key={user.id}>
                  <td className="max-w-64 p-2"><span className="block break-words font-medium text-fg">{user.username}</span><span className="block break-all text-xs text-fg-muted">{user.email}</span></td>
                  <td className="p-2 text-xs"><span className="block text-fg">{humanise(user.status)}</span>{user.role === "ADMIN" ? <span className="text-lavender">Admin</span> : null}</td>
                  <td className="p-2 text-xs">{user.emailVerified ? <span className="text-fg-muted">Verified</span> : <span className="text-lavender">Not verified</span>}</td>
                  <td className="p-2 text-xs text-fg-muted">{formatDate(user.createdAt)}</td>
                  <td className="p-2 text-xs text-fg-muted">{formatDate(user.lastActiveAt)}</td>
                  <td className="p-2 text-fg">{user.completedWorkoutCount}</td>
                  <td className="p-2 text-xs text-fg-muted">{formatDate(user.lastWorkoutAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 ? <p className="p-4 text-outline">No accounts yet.</p> : null}
        </div>
      </Panel>
      {notice ? <p className="text-sm text-outline" role="status">{notice}</p> : null}
    </section>
  );
}

function SortSelect({ onChange, value }: { onChange(value: SortOption): void; value: SortOption }): ReactNode {
  const id = useId();
  return (
    <div className="min-w-0 basis-40">
      <label className="label-caps block text-outline" htmlFor={id}>Sort by</label>
      <select
        className="mt-1 min-h-11 w-full min-w-0 rounded border border-outline-dim bg-surface-low px-2 text-sm text-fg focus:border-cyan focus:outline-none"
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
    <div className="rounded border border-outline-dim/60 bg-surface/60 p-4">
      <p className="text-xs text-fg-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold text-fg">{value}</p>
      <p className="mt-1 text-xs leading-5 text-outline">{detail}</p>
    </div>
  );
}

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "Never";
}

function timeOf(value: string | null): number {
  return value ? new Date(value).getTime() : 0;
}

function compareUsers(a: AdminUser, b: AdminUser, sort: SortOption): number {
  if (sort === "NEWEST") return timeOf(b.createdAt) - timeOf(a.createdAt);
  if (sort === "MOST_WORKOUTS") return b.completedWorkoutCount - a.completedWorkoutCount;
  return timeOf(b.lastActiveAt) - timeOf(a.lastActiveAt);
}
