"use client";

import { TrackingExample } from "../tracking/tracking-example";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button, buttonClass } from "../../shared/ui/button";
import { IconForward } from "../../shared/ui/icons";
import { demoLessons, lessonFlag } from "./demo-lessons";
import { useOnboarding } from "./use-onboarding";

const listClass = "divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface";
const rowClass = "flex min-h-[3.75rem] items-center gap-3 px-4 py-2 active:bg-surface-raised";
const groupTitle = "mb-2 px-4 text-subhead text-text-secondary";

export function HelpScreen({ extendedTracking = false }: { extendedTracking?: boolean }): ReactNode {
  const { onboarding, error, retry } = useOnboarding();
  return <div className="mx-auto max-w-3xl space-y-8 px-4 py-4 lg:px-6">
    <header>
      <h1 className="text-title-1 text-text">Help</h1>
      <p className="mt-2 text-body text-text-secondary">Everything here uses example data. Your account isn&apos;t touched.</p>
    </header>
    {error ? <div className="rounded-[var(--radius-card)] bg-surface p-4" role="status"><p className="text-body text-text">{error}</p><Button className="mt-3" onClick={() => void retry()} size="compact" variant="secondary">Retry sync</Button></div> : null}
    <section className="rounded-[var(--radius-card)] bg-surface p-4">
      <h2 className="text-title-3 text-text">Take the tour</h2>
      <p className="mt-1 text-body text-text-secondary">Log a set in an example workout, finish it, and see it in Progress and Volume. About a minute.</p>
      <Link className={`${buttonClass("primary")} mt-4 w-full`} href="/help/demo">Take the tour</Link>
    </section>
    <section>
      <h2 className={groupTitle}>Or try one step</h2>
      <ul className={listClass}>{demoLessons.map((lesson, index) => {
        const done = onboarding?.steps[lessonFlag(lesson.id)];
        const skipped = onboarding?.steps[lessonFlag(lesson.id, true)];
        return <li key={lesson.id}><Link className={rowClass} href={`/help/demo?lesson=${lesson.id}`}>
          <span className="min-w-0 flex-1 text-body text-text">{index + 1}. {lesson.title}</span>
          <span className="text-subhead text-text-secondary">{done ? "Completed" : skipped ? "Skipped" : ""}</span>
          <IconForward className="shrink-0 text-text-muted" />
        </Link></li>;
      })}</ul>
    </section>
    <section>
      <h2 className={groupTitle}>Explore at your own pace</h2>
      <ul className={listClass}>{[["history", "Example history"], ["progress", "Example progress"], ["volume", "Example volume"]].map(([path, label]) => <li key={path}><Link className={rowClass} href={`/help/demo?explore=${path}`}><span className="min-w-0 flex-1 text-body text-text">{label}</span><IconForward className="shrink-0 text-text-muted" /></Link></li>)}</ul>
    </section>
    {extendedTracking ? <TrackingExample /> : null}
    <section>
      <h2 className={groupTitle}>Quick reference</h2>
      <dl className="space-y-4 rounded-[var(--radius-card)] bg-surface p-4">
        <div><dt className="text-headline text-text">Working and warm-up sets</dt><dd className="mt-1 text-body text-text-secondary">Working sets drive the progress chart and muscle volume. Warm-ups remain in History and summary totals.</dd></div>
        <div><dt className="text-headline text-text">Muscle volume</dt><dd className="mt-1 text-body text-text-secondary">Each working set counts as 1 for primary muscles and 0.5 for secondary muscles. Warm-ups and cardio do not count toward muscle volume.</dd></div>
        <div><dt className="text-headline text-text">Reps in reserve (RIR)</dt><dd className="mt-1 text-body text-text-secondary">Reps in reserve: how many clean repetitions you estimate remained.</dd></div>
        <div><dt className="text-headline text-text">Estimated 1RM</dt><dd className="mt-1 text-body text-text-secondary">A calculated strength estimate for comparing trends, not an exact measurement.</dd></div>
      </dl>
    </section>
    <section>
      <ul className={listClass}>
        <li><Link className={rowClass} href="/privacy"><span className="min-w-0 flex-1 text-body text-text">Privacy and data</span><IconForward className="shrink-0 text-text-muted" /></Link></li>
        <li><Link className={rowClass} href="/support"><span className="min-w-0 flex-1 text-body text-text">Support and status</span><IconForward className="shrink-0 text-text-muted" /></Link></li>
      </ul>
    </section>
  </div>;
}
