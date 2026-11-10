"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ConfirmDialog } from "../../shared/ui/confirm-dialog";
import { Button } from "../../shared/ui/button";
import { Skeleton } from "../../shared/ui/ui";
import { errorMessage } from "../../shared/api/client";
import { useCompletedExercises, useExerciseSearch, useMergeExercises } from "../../shared/api/hooks";
import type { MergeExercisesResult } from "../../shared/api/types";
import { IconClose, IconPlus } from "../../shared/ui/icons";
import { Group, Row, inputClass } from "./settings-ui";

interface MergeCandidate { id: string; name: string }

export function MergeExercisesPanel(): ReactNode {
  const merge = useMergeExercises();
  const completed = useCompletedExercises();
  const [source, setSource] = useState<MergeCandidate | null>(null);
  const [target, setTarget] = useState<MergeCandidate | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<MergeExercisesResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sourceSets = completed.data?.find((item) => item.id === source?.id)?.totalSets ?? 0;
  const ready = source !== null && target !== null && source.id !== target.id;

  async function commit(): Promise<void> {
    if (!source || !target) return;
    setError(null);
    try {
      setResult(await merge.mutateAsync({ sourceExerciseId: source.id, targetExerciseId: target.id }));
      setSource(null);
      setTarget(null);
    } catch (caught) {
      setError(errorMessage(caught, "Couldn't replace the exercise. Check your connection and try again."));
    } finally {
      setConfirming(false);
    }
  }

  return (
    <>
      <Group>
        <Row>
          <p className="text-footnote text-text-secondary">Swap a duplicate or misnamed exercise for the one you want to keep, in your workouts and templates. This can’t be undone.</p>
        </Row>
        <Row><ExercisePicker excludeId={target?.id ?? null} label="Duplicate to replace" onClear={() => setSource(null)} onSelect={(candidate) => { setSource(candidate); setResult(null); }} selected={source} /></Row>
        <Row><ExercisePicker excludeId={source?.id ?? null} label="Exercise to keep" onClear={() => setTarget(null)} onSelect={(candidate) => { setTarget(candidate); setResult(null); }} selected={target} /></Row>
        {ready ? <Row><Button className="w-full" onClick={() => setConfirming(true)} variant="secondary">Review replacement</Button></Row> : null}
        {result ? <Row><MergeResult result={result} /></Row> : null}
        {error ? <Row><p className="text-footnote text-danger" role="alert">{error}</p></Row> : null}
      </Group>
      <ConfirmDialog
        confirmLabel="Replace exercise"
        isOpen={confirming && source !== null && target !== null}
        isPending={merge.isPending}
        message={source && target ? `Replace “${source.name}” with “${target.name}” in your workouts and templates, including ${sourceSets} logged ${sourceSets === 1 ? "set" : "sets"}. This can’t be undone.` : "This can’t be undone."}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void commit()}
        pendingLabel="Replacing…"
        title="Replace this exercise?"
      />
    </>
  );
}

function MergeResult({ result }: { result: MergeExercisesResult }): ReactNode {
  return (
    <div role="status">
      <p className="text-headline text-success">Exercise replaced</p>
      <p className="mt-1 text-subhead text-text-secondary">
        {result.affectedSets} sets across {result.affectedWorkouts} workouts and {result.reassignedTemplateExercises} references across {result.affectedTemplates} templates moved from “{result.source.name}” to “{result.target.name}”.
        {result.source.retired ? " The duplicate was removed from the catalog." : ""}
      </p>
    </div>
  );
}

function ExercisePicker({ excludeId, label, onClear, onSelect, selected }: { excludeId: string | null; label: string; onClear: () => void; onSelect: (candidate: MergeCandidate) => void; selected: MergeCandidate | null }): ReactNode {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const results = useExerciseSearch(debounced);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(search), 180);
    return () => window.clearTimeout(timeout);
  }, [search]);

  if (selected) {
    return (
      <div>
        <p className="mb-1 text-subhead text-text-secondary">{label}</p>
        <div className="flex min-h-11 items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-body text-text">{selected.name}</span>
          <button aria-label={`Clear ${label}`} className="flex size-11 shrink-0 items-center justify-center rounded-full text-text-secondary active:opacity-70" onClick={onClear} type="button"><IconClose /></button>
        </div>
      </div>
    );
  }
  const candidates = (results.data ?? []).filter((exercise) => exercise.id !== excludeId);
  return (
    <div>
      <label className="block">
        <span className="mb-1 block text-subhead text-text-secondary">{label}</span>
        <input aria-label={`Search ${label}`} className={inputClass} onChange={(event) => setSearch(event.currentTarget.value)} placeholder="Search exercises" type="search" value={search} />
      </label>
      {search.trim() ? (
        <div className="mt-2 max-h-56 overflow-y-auto">
          {results.isLoading ? <Skeleton className="h-11" /> : candidates.length === 0 ? <p className="py-2 text-subhead text-text-secondary">No exercises found.</p> : candidates.map((exercise) => (
            <button className="flex min-h-11 w-full items-center justify-between gap-3 py-2 text-left active:opacity-70" key={exercise.id} onClick={() => { onSelect({ id: exercise.id, name: exercise.name }); setSearch(""); }} type="button">
              <span className="min-w-0"><span className="block break-words text-body text-text">{exercise.name}</span><span className="block break-words text-footnote text-text-secondary">{exercise.primaryMuscleGroup.name}</span></span><IconPlus className="shrink-0 text-accent" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
