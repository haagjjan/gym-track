"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { IconCheck24, IconClose } from "../../shared/ui/icons";
import { useDemo } from "./demo-provider";
import { currentInstruction, demoLessons, lessonFlag } from "./demo-lessons";
import { lessonSatisfied, prepareLesson } from "./demo-state";
import { useOnboarding } from "./use-onboarding";

/** How long the check mark shows before the tour moves on by itself. */
const ADVANCE_DELAY_MS = 1100;

/**
 * The tour's only chrome: one line under the top bar with progress dots, what
 * to do next, and a close button. Steps complete on the action itself and the
 * tour moves on by itself; there is nothing to press to continue.
 */
export function DemoGuide(): ReactNode {
  const { state, setState } = useDemo();
  const { mark, error } = useOnboarding();
  const router = useRouter();
  const index = state.lesson;
  const lesson = index === null ? null : demoLessons[index] ?? null;
  const done = Boolean(lesson && lessonSatisfied(lesson.id, state.events));
  const advancedFrom = useRef<number | null>(null);

  useEffect(() => {
    if (!done || !lesson || index === null || advancedFrom.current === index) return;
    advancedFrom.current = index;
    void mark(lessonFlag(lesson.id));
    const timer = window.setTimeout(() => {
      const nextIndex = index + 1;
      setState((current) => nextIndex < demoLessons.length ? prepareLesson(current, nextIndex) : { ...current, lesson: nextIndex });
      router.push(`/help/demo/${demoLessons[nextIndex]?.path ?? ""}`);
    }, ADVANCE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [done, index, lesson, mark, router, setState]);

  function endTour(): void {
    if (lesson && !done) void mark(lessonFlag(lesson.id, true));
    setState((current) => ({ ...current, lesson: null }));
  }

  if (!lesson || index === null) {
    return error ? <SyncNotice error={error} /> : null;
  }

  // z-30 keeps the card above the 3D canvas and its ambience layers (z-0).
  return (
    <aside aria-label="Tour" className="relative z-30 mx-4 mt-2 rounded-[var(--radius-card)] bg-surface py-2 pl-4 pr-1 lg:mx-6">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <ol aria-label={`Step ${index + 1} of ${demoLessons.length}`} className="flex gap-1">
              {demoLessons.map((item, dot) => (
                <li aria-hidden className={`h-1.5 rounded-full transition-all duration-200 ${dot === index ? "w-4 bg-accent" : dot < index ? "w-1.5 bg-accent" : "w-1.5 bg-control-line"}`} key={item.id} />
              ))}
            </ol>
            <p className="truncate text-footnote font-semibold text-text-secondary">{lesson.title}</p>
          </div>
          <p aria-live="polite" className={`mt-0.5 flex items-center gap-1.5 text-callout ${done ? "text-success" : "text-text"}`}>
            {done ? <><IconCheck24 className="size-5 shrink-0" /> Done</> : currentInstruction(lesson.id, state.events)}
          </p>
        </div>
        <button aria-label="End tour" className="flex size-11 shrink-0 items-center justify-center rounded-full text-text-secondary active:bg-surface-raised" onClick={endTour} type="button">
          <IconClose />
        </button>
      </div>
      {error ? <p className="mt-1 text-footnote text-warning" role="status">{error} <Link className="underline" href="/help">Open Help</Link></p> : null}
    </aside>
  );
}

function SyncNotice({ error }: { error: string }): ReactNode {
  return <p className="relative z-30 mx-4 mt-2 text-footnote text-warning lg:mx-6" role="status">{error} <Link className="underline" href="/help">Open Help</Link></p>;
}
