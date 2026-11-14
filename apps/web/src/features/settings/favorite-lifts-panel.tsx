"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Skeleton } from "../../shared/ui/ui";
import { useExerciseSearch } from "../../shared/api/hooks";
import { IconClose, IconPlus } from "../../shared/ui/icons";
import {
  MAX_FAVORITE_LIFTS,
  useFavoriteLifts,
  type FavoriteLift
} from "../dashboard/use-favorite-lifts";
import { Group, Row, SavedStatus, inputClass, useSavedFlash } from "./settings-ui";

export function FavoriteLiftsPanel(): ReactNode {
  const { favorites, save: saveFavorites, isLoaded } = useFavoriteLifts();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const results = useExerciseSearch(debounced);
  const { flash, saved } = useSavedFlash();

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(search), 180);
    return () => window.clearTimeout(timeout);
  }, [search]);

  function save(next: FavoriteLift[]): void {
    saveFavorites(next);
    flash();
  }

  function addFavorite(lift: FavoriteLift): void {
    if (favorites.length >= MAX_FAVORITE_LIFTS || favorites.some((item) => item.id === lift.id)) return;
    save([...favorites, lift]);
    setSearch("");
  }

  const candidates = (results.data ?? []).filter((exercise) => !exercise.trackingMode).filter(
    (exercise) => !favorites.some((item) => item.id === exercise.id)
  );

  return (
    <div className="space-y-2">
      <Group>
        <Row>
          <p className="text-footnote text-text-secondary">Pin up to {MAX_FAVORITE_LIFTS} lifts for Personal bests on Home.</p>
        </Row>
        {!isLoaded ? <Row><Skeleton className="h-11" /></Row> : (
          <>
            {favorites.length === 0 ? (
              <Row><p className="text-subhead text-text-secondary">No pinned lifts yet. Search below to pin one.</p></Row>
            ) : favorites.map((lift) => (
              <div className="flex min-h-11 items-center gap-3 pl-4 pr-1" key={lift.id}>
                <span className="min-w-0 flex-1 truncate py-3 text-body text-text">{lift.name}</span>
                <button aria-label={`Unpin ${lift.name}`} className="flex size-11 shrink-0 items-center justify-center rounded-full text-text-secondary active:opacity-70" onClick={() => save(favorites.filter((item) => item.id !== lift.id))} type="button"><IconClose /></button>
              </div>
            ))}
            {favorites.length < MAX_FAVORITE_LIFTS ? (
              <Row>
                <input aria-label="Search lifts to pin" className={inputClass} onChange={(event) => setSearch(event.currentTarget.value)} placeholder="Search exercises" type="search" value={search} />
                {search.trim() ? (
                  <div className="mt-2 max-h-56 overflow-y-auto">
                    {results.isLoading ? <Skeleton className="h-11" /> : candidates.length === 0 ? <p className="py-2 text-subhead text-text-secondary">No exercises found.</p> : candidates.map((exercise) => (
                      <button className="flex min-h-11 w-full items-center justify-between gap-3 py-2 text-left active:opacity-70" key={exercise.id} onClick={() => addFavorite({ id: exercise.id, name: exercise.name })} type="button">
                        <span className="min-w-0"><span className="block break-words text-body text-text">{exercise.name}</span><span className="block break-words text-footnote text-text-secondary">{exercise.primaryMuscleGroup.name}</span></span><IconPlus className="shrink-0 text-accent" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </Row>
            ) : <Row><p className="text-subhead text-text-secondary">You have pinned {MAX_FAVORITE_LIFTS} lifts. Unpin one to add another.</p></Row>}
          </>
        )}
      </Group>
      <SavedStatus saved={saved} />
    </div>
  );
}
