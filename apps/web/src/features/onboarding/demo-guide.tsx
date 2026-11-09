"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Button, buttonClass } from "../../shared/ui/button";
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
  // z-30 keeps the card above the 3D canvas and its ambience layers (z-0).
  return <aside aria-label="Example guide" className="relative z-30 mx-4 mt-2 rounded-[var(--radius-card)] bg-surface p-3 lg:mx-6">
    <div className="flex items-center justify-between gap-2">
      <p className="min-w-0 text-subhead text-text-secondary">{lesson ? `Step ${state.lesson! + 1} of ${demoLessons.length}: ${lesson.title}` : "Example data, separate from your account"}</p>
      <Link className={`${buttonClass("plain", "compact")} -mr-3 shrink-0`} href="/">Exit example</Link>
    </div>
    {lesson ? <>
      <p aria-live="polite" className="mt-1 text-callout text-text">{ready ? "Done. Continue when you\u2019re ready." : currentInstruction(lesson.id, state.events)}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button disabled={!ready} onClick={() => next(false)} size="compact">{state.lesson === 5 ? "Finish example" : "Continue"}</Button>
        <Button onClick={() => next(true)} size="compact" variant="secondary">Skip step</Button>
        <Button onClick={() => { setState((current) => prepareLesson(current, state.lesson!)); router.push(`/help/demo/${lesson.path}`); }} size="compact" variant="secondary">Restart step</Button>
      </div>
    </> : <p className="text-callout text-text-secondary">Explore freely. The example resets when you reload or exit.</p>}
    {error ? <p role="status" className="mt-2 text-footnote text-warning">{error} <Link className="underline" href="/help">Open Help</Link></p> : null}
  </aside>;
}
