"use client";

import { useEffect, useState, type ReactNode } from "react";
import { EmptyState, Panel, Skeleton } from "../../shared/ui/ui";
import { useExerciseSearch } from "../../shared/api/hooks";
import { IconClose, IconPlus } from "../shell/icons";
import {
  MAX_FAVORITE_LIFTS,
  useFavoriteLifts,
  type FavoriteLift
} from "../dashboard/use-favorite-lifts";

export function FavoriteLiftsPanel(): ReactNode {
  const { favorites, save, isLoaded } = useFavoriteLifts();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const results = useExerciseSearch(debounced);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(search), 180);
    return () => window.clearTimeout(timeout);
  }, [search]);

  function addFavorite(lift: FavoriteLift): void {
    if (favorites.length >= MAX_FAVORITE_LIFTS || favorites.some((item) => item.id === lift.id)) return;
    save([...favorites, lift]);
    setSearch("");
  }

  const candidates = (results.data ?? []).filter(
    (exercise) => !favorites.some((item) => item.id === exercise.id)
  );

  return (
    <Panel accent="cyan" eyebrow="FAVORITE_LIFTS">
      <p className="mb-3 text-[11px] leading-relaxed text-fg-muted">
        Pin up to {MAX_FAVORITE_LIFTS} lifts for the dashboard performance panel.
        Stored on this device.
      </p>
      {!isLoaded ? <Skeleton className="h-24" /> : (
        <>
          {favorites.length === 0 ? (
            <EmptyState message="Search below and pin your headline lifts." title="NO_PINNED_LIFTS" />
          ) : (
            <ul className="space-y-1.5">
              {favorites.map((lift, index) => (
                <li className="flex min-h-11 items-center gap-3 rounded border border-cyan/30 bg-surface-low/40 px-3" key={lift.id}>
                  <span className="font-mono text-[10px] text-outline">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-fg">{lift.name}</span>
                  <button aria-label={`Unpin ${lift.name}`} className="flex size-9 items-center justify-center rounded text-outline hover:text-red" onClick={() => save(favorites.filter((item) => item.id !== lift.id))} type="button"><IconClose /></button>
                </li>
              ))}
            </ul>
          )}
          {favorites.length < MAX_FAVORITE_LIFTS ? (
            <div className="mt-3">
              <input aria-label="Search lifts to pin" className="min-h-11 w-full rounded border border-outline-dim bg-surface-low/60 px-3 font-mono text-sm text-fg placeholder:text-outline focus:border-cyan focus:outline-none" onChange={(event) => setSearch(event.currentTarget.value)} placeholder="Search exercise catalog…" type="search" value={search} />
              {search.trim() ? (
                <div className="mt-2 max-h-52 space-y-1 overflow-y-auto">
                  {results.isLoading ? <Skeleton className="h-11" /> : candidates.length === 0 ? <p className="text-[11px] text-outline">NO_MATCH</p> : candidates.map((exercise) => (
                    <button className="flex min-h-11 w-full items-center justify-between rounded border border-outline-dim/60 px-3 text-left hover:border-cyan/60" key={exercise.id} onClick={() => addFavorite({ id: exercise.id, name: exercise.name })} type="button">
                      <span><span className="block text-sm text-fg">{exercise.name}</span><span className="text-[9px] uppercase text-outline">{exercise.primaryMuscleGroup.name}</span></span><IconPlus className="text-cyan-dim" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : <p className="mt-2 text-[10px] uppercase text-outline">ALL_SLOTS_PINNED</p>}
        </>
      )}
    </Panel>
  );
}
