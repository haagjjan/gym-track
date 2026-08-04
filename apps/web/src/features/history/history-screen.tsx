"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ConfirmDialog } from "../../shared/ui/confirm-dialog";
import { EmptyState, ErrorState, HudButton, Metric, Panel, Skeleton } from "../../shared/ui/ui";
import { errorMessage } from "../../shared/api/client";
import { useWorkoutDetails, useWorkoutMutations, useWorkoutsInfinite } from "../../shared/api/hooks";
import type { WorkoutSummary } from "../../shared/api/types";
import { formatNumber } from "../../shared/format";
import { IconPlus } from "../shell/icons";
import { FacetFilters, type FacetFilterValue } from "../workouts/facet-filters";
import { usePersistentFilters } from "../workouts/filter-persistence";
import { WorkoutTabs } from "../workouts/workout-tabs";
import { CsvPanel } from "./csv-panel";
import { HistoryRow } from "./history-row";

const historySortOptions = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "name", label: "Name A–Z" }
];
const historySortValues = ["newest", "oldest", "name"] as const;

export function HistoryScreen({ userId }: { userId: string }): ReactNode {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const { clear, filters, setFilters, setSort, sort } = usePersistentFilters({
    allowedSorts: historySortValues,
    defaultSort: "newest",
    surface: "history",
    userId
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<WorkoutSummary | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const workouts = useWorkoutsInfinite({ search, ...filters, sort });
  const { deleteWorkout } = useWorkoutMutations();

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const items = useMemo(
    () => (workouts.data?.pages.flatMap((page) => page.items) ?? []).filter((item) => !hiddenIds.has(item.id)),
    [hiddenIds, workouts.data]
  );
  const total = workouts.data?.pages[0]?.pagination.total ?? 0;
  const allTime = workouts.data?.pages[0]?.allTimeSummary;
  const detailIds = expandedId && !hiddenIds.has(expandedId) ? [expandedId] : [];
  const details = useWorkoutDetails(detailIds);
  const groups = useMemo(() => groupWorkouts(items, sort), [items, sort]);

  function confirmDeletion(): void {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    setExpandedId(null);
    setActionError(null);
    setHiddenIds((current) => new Set(current).add(target.id));
    deleteWorkout.mutate(target.id, {
      onError: (caught) => {
        setHiddenIds((current) => {
          const next = new Set(current);
          next.delete(target.id);
          return next;
        });
        setActionError(errorMessage(caught, "The workout could not be deleted."));
      },
      onSuccess: () => {
        setStatus(`${target.title ?? "Workout"} deleted.`);
        void workouts.refetch();
      }
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 lg:p-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex items-end justify-between gap-3 md:justify-start">
          <div><p className="label-caps text-outline">WORKOUTS</p><h1 className="font-display text-2xl font-bold text-fg">Workout history</h1></div>
          <HudButton onClick={() => router.push("/workout")}><IconPlus /> New Session</HudButton>
        </div>
        <div className="hidden md:block">
          <SearchInput onChange={setSearchInput} value={searchInput} />
        </div>
      </header>

      <WorkoutTabs active="history" />
      <div className="md:hidden"><SearchInput onChange={setSearchInput} value={searchInput} /></div>

      <FacetFilters
        filters={filters}
        onChange={setFilters}
        onClear={clear}
        onSortChange={(value) => setSort(value as typeof sort)}
        sort={sort}
        sortOptions={historySortOptions}
      />

      {actionError ? <ErrorState message={actionError} title="DELETE_FAILED" /> : null}
      <p aria-live="polite" className="sr-only">{status}</p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryMetric accent="cyan" label="TOTAL SESSIONS" loading={workouts.isLoading} value={allTime ? String(allTime.totalSessions) : "—"} />
        <SummaryMetric accent="cyan" label="TONNAGE" loading={workouts.isLoading} value={allTime ? `${formatNumber(Number(allTime.cumulativeTonnageKg))} kg` : "—"} />
        <SummaryMetric accent="lavender" label="AVG DURATION" loading={workouts.isLoading} value={allTime?.averageCompletedDurationSeconds != null ? `${Math.round(allTime.averageCompletedDurationSeconds / 60)} min` : "—"} />
        <SummaryMetric accent="cyan" label="COMPLETION" loading={workouts.isLoading} value={allTime ? `${Math.round(allTime.completionRate * 100)}%` : "—"} />
      </div>

      {workouts.isError ? <ErrorState message={errorMessage(workouts.error, "Workout history could not be loaded.")} retry={() => void workouts.refetch()} /> : null}
      {workouts.isLoading ? <HistorySkeleton /> : items.length === 0 ? (
        <EmptyState action={<Link className="text-cyan" href="/workout">Start a workout →</Link>} message={search || hasFilters(filters) ? "No workout matches these filters." : "Completed workouts will appear here."} title={search || hasFilters(filters) ? "NO_MATCHES" : "NO_WORKOUTS"} />
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.label ?? "results"}>
              {group.label ? <h2 className="mb-2 font-display text-sm font-bold text-outline">{group.label}</h2> : null}
              <ul className="space-y-2">
                {group.items.map((workout) => (
                  <HistoryRow
                    detail={details[workout.id]}
                    isExpanded={expandedId === workout.id}
                    key={workout.id}
                    onDelete={() => setDeleting(workout)}
                    onToggle={() => setExpandedId((current) => current === workout.id ? null : workout.id)}
                    workout={workout}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {workouts.hasNextPage ? <div className="flex justify-center"><HudButton disabled={workouts.isFetchingNextPage} onClick={() => void workouts.fetchNextPage()} variant="outline">{workouts.isFetchingNextPage ? "Loading…" : `Load more (${items.length}/${total})`}</HudButton></div> : null}
      <CsvPanel onImported={() => void workouts.refetch()} />
      <ConfirmDialog
        confirmLabel={deleting?.isOpen ? "DISCARD WORKOUT" : "DELETE LOG"}
        isOpen={deleting !== null}
        isPending={false}
        message={deleting?.isOpen ? "This active workout and its sets will be removed." : "This workout will be removed from history and analytics."}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDeletion}
        title={deleting?.isOpen ? "Discard this workout?" : "Delete this workout log?"}
      />
    </div>
  );
}

function SearchInput({ onChange, value }: { onChange: (value: string) => void; value: string }): ReactNode { return <label className="block md:w-72"><span className="sr-only">Search workout history</span><input className="min-h-11 w-full rounded border border-outline-dim bg-surface-low/60 px-3 text-sm text-fg placeholder:text-outline focus:border-cyan focus:outline-none" onChange={(event) => onChange(event.currentTarget.value)} placeholder="Date, workout, exercise, muscle…" type="search" value={value} /></label>; }
function SummaryMetric({ accent, label, loading, value }: { accent: "cyan" | "green" | "lavender"; label: string; loading: boolean; value: string }): ReactNode { return <Panel accent={accent}><Metric label={label} tone={accent} value={loading ? "…" : value} /></Panel>; }
function HistorySkeleton(): ReactNode { return <div className="space-y-2"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>; }
function hasFilters(filters: FacetFilterValue): boolean { return filters.muscleGroupIds.length > 0 || Boolean(filters.equipment || filters.exerciseType); }
function groupWorkouts(items: WorkoutSummary[], sort: string): Array<{ label: string | null; items: WorkoutSummary[] }> {
  if (sort !== "newest") return [{ label: null, items }];
  const groups = new Map<string, WorkoutSummary[]>();
  for (const item of items) { const label = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(item.startedAt)); groups.set(label, [...(groups.get(label) ?? []), item]); }
  return [...groups].map(([label, groupedItems]) => ({ label, items: groupedItems }));
}
