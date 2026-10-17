"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { HudButton } from "../../shared/ui/ui";
import { useDemo } from "./demo-provider";
import { currentInstruction, demoLessons, lessonFlag } from "./demo-lessons";
import { lessonSatisfied, prepareLesson } from "./demo-state";
import { useOnboarding } from "./use-onboarding";

export function DemoGuide(): ReactNode {
  const { state, setState } = useDemo();
  const { mark, error } = useOnboarding();
  const router = useRouter();
  const lesson = state.lesson === null ? null : demoLessons[state.lesson];
  const ready = Boolean(lesson && lessonSatisfied(lesson.id, state.events));
  useEffect(() => { if (ready && lesson) void mark(lessonFlag(lesson.id)); }, [ready, lesson, mark]);
  function next(skipped: boolean): void {
    if (!lesson || state.lesson === null) return;
    if (skipped && !ready) void mark(lessonFlag(lesson.id, true));
    const nextIndex = state.lesson + 1;
    setState((current) => prepareLesson(current, nextIndex));
    router.push(`/help/demo/${demoLessons[nextIndex]?.path ?? ""}`);
  }
  return <aside aria-label="Example guide" className="mx-4 mt-4 rounded-xl border border-cyan/40 bg-surface p-3 lg:mx-6">
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-cyan">Example data — separate from your account</p><Link className="inline-flex min-h-11 items-center text-sm text-fg-muted" href="/">Exit example →</Link></div>
    {lesson ? <>
      <p className="text-xs text-outline">Step {state.lesson! + 1} of {demoLessons.length} · {lesson.title}</p>
      <p aria-live="polite" className="mt-1 text-sm text-fg">{ready ? "Done. Continue when you’re ready." : currentInstruction(lesson.id, state.events)}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <HudButton disabled={!ready} onClick={() => next(false)}>{state.lesson === 5 ? "Finish example" : "Continue"}</HudButton>
        <HudButton onClick={() => next(true)} variant="ghost">Skip step</HudButton>
        <HudButton onClick={() => { setState((current) => prepareLesson(current, state.lesson!)); router.push(`/help/demo/${lesson.path}`); }} variant="ghost">Restart step</HudButton>
      </div>
    </> : <p className="text-xs text-fg-muted">Explore freely. Practice resets when you reload or exit.</p>}
    {error ? <p role="status" className="mt-2 text-xs text-lavender">{error} <Link className="underline" href="/help">Open Help</Link></p> : null}
  </aside>;
}
