"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { apiFetch, errorMessage } from "../../shared/api/client";
import type { Exercise } from "../../shared/api/types";
import { useTemplateMutations } from "../../shared/api/hooks";
import { useStartSession } from "../session/use-start-session";
import { Button } from "../../shared/ui/button";
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
    } catch (caught) { setError(caught instanceof Error ? caught.message : errorMessage(caught, "Couldn't copy the template. Check your connection and try again.")); }
    finally { copyingRef.current = false; setCopying(false); }
  }
  return <section className="rounded-[var(--radius-card)] bg-surface p-4"><h2 className="text-title-3 text-text">Ready for your own workout?</h2>
    <p className="mt-2 text-body text-text-secondary">Keep the example exercise list if it suits you. Example weights and history are never copied.</p>
    <div className="mt-4 flex flex-col gap-2"><Button disabled={isPending} onClick={() => void start()}>Start my workout</Button><Button disabled={copying || copied} onClick={() => void copy()} variant="secondary">{copied ? "Template copied" : copying ? "Copying…" : "Copy example template"}</Button></div>
    {copied ? <p className="mt-3 text-body text-success" role="status">Exercise list copied. <Link className="underline" href={`/workouts/templates?template=${state.copiedTemplateId}`}>View saved template</Link></p> : null}
    {error || startError ? <p className="mt-3 text-body text-danger" role="alert">{error ?? startError}</p> : null}
  </section>;
}
