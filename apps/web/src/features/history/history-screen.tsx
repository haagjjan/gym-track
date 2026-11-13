"use client";

import { TrackingCsvPanel } from "../tracking/tracking-csv-panel";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button, buttonClass } from "../../shared/ui/button";
import { StatTile } from "../../shared/ui/stat-tile";
import { ErrorState, Skeleton } from "../../shared/ui/ui";
import { errorMessage } from "../../shared/api/client";
import { useWorkoutsInfinite } from "../../shared/api/hooks";
import type { WorkoutSummary } from "../../shared/api/types";
import { formatCompactNumber } from "../../shared/format";
import { FacetFilters, type FacetFilterValue } from "../workouts/facet-filters";
import { usePersistentFilters } from "../workouts/filter-persistence";
import { CsvPanel } from "./csv-panel";
import { HistoryRow } from "./history-row";

const historySortOptions = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "name", label: "Name A–Z" }
];
const historySortValues = ["newest", "oldest", "name"] as const;

export function HistoryScreen({ userId, extendedTracking = false }: { userId: string; extendedTracking?: boolean }): ReactNode {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const { clear, filters, setFilters, setSort, sort } = usePersistentFilters({
    allowedSorts: historySortValues,
    defaultSort: "newest",
    surface: "history",
    userId
  });
  const workouts = useWorkoutsInfinite({ search, ...filters, sort });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const items = useMemo(() => workouts.data?.pages.flatMap((page) => page.items) ?? [], [workouts.data]);
  const total = workouts.data?.pages[0]?.pagination.total ?? 0;
  const allTime = workouts.data?.pages[0]?.allTimeSummary;
  const groups = useMemo(() => groupWorkouts(items, sort), [items, sort]);
  const isFiltered = Boolean(search) || hasFilters(filters);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pb-8 pt-4">
      <h1 className="text-large-title text-text">History</h1>

      {workouts.isLoading ? (
        <Skeleton className="h-[4.25rem] rounded-[var(--radius-card)]" />
      ) : allTime ? (
        <dl className="grid grid-cols-3 gap-3 rounded-[var(--radius-card)] bg-surface p-4">
          <StatTile label="Workouts" value={String(allTime.totalSessions)} />
          <StatTile label="Volume" unit="kg" value={formatCompactNumber(Number(allTime.cumulativeTonnageKg))} />
          <StatTile
            label="Average"
            unit={allTime.averageCompletedDurationSeconds != null ? "min" : undefined}
            value={allTime.averageCompletedDurationSeconds != null ? String(Math.round(allTime.averageCompletedDurationSeconds / 60)) : "–"}
          />
        </dl>
      ) : null}

      <div className="space-y-3">
        <SearchInput onChange={setSearchInput} value={searchInput} />
        <FacetFilters
          filters={filters}
          onChange={setFilters}
          onClear={clear}
          onSortChange={(value) => setSort(value as typeof sort)}
          sort={sort}
          sortOptions={historySortOptions}
        />
      </div>

      {workouts.isError ? <ErrorState message={errorMessage(workouts.error, "Couldn't load your workouts. Check your connection and try again.")} retry={() => void workouts.refetch()} /> : null}
      {workouts.isLoading ? <HistorySkeleton /> : items.length === 0 && !workouts.isError ? (
        <div className="space-y-4 rounded-[var(--radius-card)] bg-surface p-4">
          <p className="text-body text-text-secondary">
            {isFiltered ? "No workouts match these filters." : "Finished workouts show up here."}
          </p>
          <Link className={`${buttonClass("primary")} w-full`} href="/workout">Start workout</Link>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.label ?? "results"}>
              {group.label ? <h2 className="mb-2 px-4 text-subhead text-text-secondary">{group.label}</h2> : null}
              <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface">
                {group.items.map((workout) => (
                  <HistoryRow
                    extendedTracking={extendedTracking}
                    isExpanded={expandedId === workout.id}
                    key={workout.id}
                    onToggle={() => setExpandedId((current) => (current === workout.id ? null : workout.id))}
                    workout={workout}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {workouts.hasNextPage ? (
        <Button className="w-full" disabled={workouts.isFetchingNextPage} onClick={() => void workouts.fetchNextPage()} variant="secondary">
          {workouts.isFetchingNextPage ? "Loading…" : `Show more (${items.length} of ${total})`}
        </Button>
      ) : null}
      <CsvPanel onImported={() => void workouts.refetch()} />
      {extendedTracking ? <TrackingCsvPanel /> : null}
    </div>
  );
}

function SearchInput({ onChange, value }: { onChange: (value: string) => void; value: string }): ReactNode {
  return (
    <label className="block">
      <span className="sr-only">Search workout history</span>
      <input
        className="min-h-[3.125rem] w-full rounded-[var(--radius-control)] border border-control-line bg-surface-raised px-3 text-body text-text placeholder:text-text-muted"
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder="Search by date, workout or exercise"
        type="search"
        value={value}
      />
    </label>
  );
}

function HistorySkeleton(): ReactNode {
  return <div className="space-y-px overflow-hidden rounded-[var(--radius-card)]"><Skeleton className="h-[3.75rem] rounded-none" /><Skeleton className="h-[3.75rem] rounded-none" /><Skeleton className="h-[3.75rem] rounded-none" /></div>;
}

function hasFilters(filters: FacetFilterValue): boolean {
  return filters.muscleGroupIds.length > 0 || Boolean(filters.equipment || filters.exerciseType);
}

function groupWorkouts(items: WorkoutSummary[], sort: string): Array<{ label: string | null; items: WorkoutSummary[] }> {
  if (sort !== "newest") return [{ label: null, items }];
  const format = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });
  const groups = new Map<string, WorkoutSummary[]>();
  for (const item of items) {
    const label = format.format(new Date(item.startedAt));
    groups.set(label, [...(groups.get(label) ?? []), item]);
  }
  return [...groups].map(([label, groupedItems]) => ({ label, items: groupedItems }));
}
