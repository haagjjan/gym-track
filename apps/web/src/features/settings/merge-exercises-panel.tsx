"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ConfirmDialog } from "../../shared/ui/confirm-dialog";
import { HudButton, Panel, Skeleton } from "../../shared/ui/ui";
import { errorMessage } from "../../shared/api/client";
import { useCompletedExercises, useExerciseSearch, useMergeExercises } from "../../shared/api/hooks";
import type { MergeExercisesResult } from "../../shared/api/types";
import { IconClose, IconPlus } from "../shell/icons";

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
      setError(errorMessage(caught, "The exercises could not be merged."));
    } finally {
      setConfirming(false);
    }
  }

  return (
    <>
      <Panel accent="red" eyebrow="Merge duplicate exercises">
        <p className="mb-3 text-[11px] leading-relaxed text-fg-muted">Replace a duplicate or misnamed exercise in your workout and template references. This cannot be undone.</p>
        <div className="space-y-3">
          <ExercisePicker excludeId={target?.id ?? null} label="MERGE_AWAY (duplicate)" onClear={() => setSource(null)} onSelect={(candidate) => { setSource(candidate); setResult(null); }} selected={source} />
          <ExercisePicker excludeId={source?.id ?? null} label="MERGE_INTO (keep)" onClear={() => setTarget(null)} onSelect={(candidate) => { setTarget(candidate); setResult(null); }} selected={target} />
          {ready ? <HudButton className="w-full" onClick={() => setConfirming(true)} variant="outline">REVIEW_MERGE</HudButton> : null}
          {result ? <MergeResult result={result} /> : null}
          {error ? <p className="text-[11px] text-red">{error}</p> : null}
        </div>
      </Panel>
      <ConfirmDialog
        confirmLabel="MERGE EXERCISES"
        isOpen={confirming && source !== null && target !== null}
        isPending={merge.isPending}
        message={source && target ? `Replace “${source.name}” with “${target.name}” in your workout and template references, including ${sourceSets} logged ${sourceSets === 1 ? "set" : "sets"}. This cannot be undone.` : "This cannot be undone."}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void commit()}
        title="Merge these exercises?"
      />
    </>
  );
}

function MergeResult({ result }: { result: MergeExercisesResult }): ReactNode {
  return (
    <div className="rounded-lg border border-green/40 bg-green/5 p-3 text-xs text-fg">
      <p className="label-caps text-green">MERGE_COMPLETE</p>
      <p className="mt-1.5">
        {result.affectedSets} sets across {result.affectedWorkouts} sessions and {result.reassignedTemplateExercises} references across {result.affectedTemplates} templates moved from “{result.source.name}” to “{result.target.name}”.
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

  if (selected) return <SelectedCandidate label={label} onClear={onClear} selected={selected} />;
  const candidates = (results.data ?? []).filter((exercise) => exercise.id !== excludeId);
  return (
    <div>
      <p className="label-caps mb-1 text-outline">{label}</p>
      <input aria-label={`Search ${label}`} className="min-h-11 w-full rounded border border-outline-dim bg-surface-low/60 px-3 font-mono text-sm text-fg placeholder:text-outline focus:border-cyan focus:outline-none" onChange={(event) => setSearch(event.currentTarget.value)} placeholder="Search exercise catalog…" type="search" value={search} />
      {search.trim() ? <div className="mt-2 max-h-52 space-y-1 overflow-y-auto">{results.isLoading ? <Skeleton className="h-11" /> : candidates.length === 0 ? <p className="text-[11px] text-outline">Nothing found</p> : candidates.map((exercise) => <button className="flex min-h-11 w-full items-center justify-between rounded border border-outline-dim/60 px-3 text-left hover:border-cyan/60" key={exercise.id} onClick={() => { onSelect({ id: exercise.id, name: exercise.name }); setSearch(""); }} type="button"><span className="min-w-0"><span className="block break-words text-sm text-fg">{exercise.name}</span><span className="block break-words text-[9px] uppercase text-outline">{exercise.primaryMuscleGroup.name}</span></span><IconPlus className="shrink-0 text-cyan-dim" /></button>)}</div> : null}
    </div>
  );
}

function SelectedCandidate({ label, onClear, selected }: { label: string; onClear: () => void; selected: MergeCandidate }): ReactNode {
  return <div><p className="label-caps mb-1 text-outline">{label}</p><div className="flex min-h-11 items-center gap-3 rounded border border-cyan/30 bg-surface-low/40 px-3"><span className="min-w-0 flex-1 truncate text-sm text-fg">{selected.name}</span><button aria-label={`Clear ${label}`} className="flex size-9 shrink-0 items-center justify-center rounded text-outline hover:text-red" onClick={onClear} type="button"><IconClose /></button></div></div>;
}
