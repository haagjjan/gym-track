"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { apiFetch, errorMessage } from "../../shared/api/client";
import type { Exercise } from "../../shared/api/types";
import { useTemplateMutations } from "../../shared/api/hooks";
import { useStartSession } from "../session/use-start-session";
import { HudButton, Panel } from "../../shared/ui/ui";
import { useDemo } from "./demo-provider";
import { demoExercises, demoTemplate } from "./demo-data";

export function DemoCopyTemplate(): ReactNode {
  const { create } = useTemplateMutations();
  const { start, isPending, error: startError } = useStartSession();
  const { state, setState } = useDemo();
  const copied = state.copiedTemplateId !== null;
  const [copying, setCopying] = useState(false);
  const copyingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  async function copy(): Promise<void> {
    if (copyingRef.current || copied) return;
    copyingRef.current = true;
    setCopying(true); setError(null);
    try {
      const resolved = await Promise.all(demoExercises.map(async (expected) => {
        const result = await apiFetch<{ items: Exercise[] }>(`/api/exercises?search=${encodeURIComponent(expected.name)}&limit=100&offset=0`);
        const match = result.items.find((item) => item.id === expected.id && item.createdByUserId === null);
        if (!match) throw new Error(`${expected.name} is unavailable in the current catalog. No template was copied.`);
        return match.id;
      }));
      const created = await create.mutateAsync({ name: demoTemplate.name, exerciseIds: resolved });
      setState((current) => ({ ...current, copiedTemplateId: created.id }));
    } catch (caught) { setError(caught instanceof Error ? caught.message : errorMessage(caught, "The example template could not be copied.")); }
    finally { copyingRef.current = false; setCopying(false); }
  }
  return <Panel accent="cyan"><h2 className="font-display text-lg font-bold text-fg">Ready for your own workout?</h2>
    <p className="mt-2 text-sm text-fg-muted">Keep the example exercise list if it suits you. Example weights and history are never copied.</p>
    <div className="mt-3 flex flex-wrap gap-2"><HudButton disabled={isPending} onClick={() => void start()}>Start my workout</HudButton><HudButton disabled={copying || copied} onClick={() => void copy()} variant="outline">{copied ? "Template copied" : copying ? "Copying…" : "Copy example template"}</HudButton></div>
    {copied ? <p className="mt-3 text-sm text-green" role="status">Exercise list copied. <Link className="underline" href={`/workouts/templates?template=${state.copiedTemplateId}`}>View saved template →</Link></p> : null}
    {error || startError ? <p className="mt-3 text-sm text-red" role="alert">{error ?? startError}</p> : null}
  </Panel>;
}
