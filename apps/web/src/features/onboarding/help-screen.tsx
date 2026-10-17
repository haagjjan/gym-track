"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { HudButton, Panel } from "../../shared/ui/ui";
import { demoLessons, lessonFlag } from "./demo-lessons";
import { useOnboarding } from "./use-onboarding";

export function HelpScreen(): ReactNode {
  const { onboarding, error, retry } = useOnboarding();
  return <div className="mx-auto max-w-3xl space-y-4 p-4 lg:p-6">
    <header><h1 className="font-display text-2xl font-bold text-fg">Help & Tutorial</h1><p className="mt-2 text-sm text-fg-muted">Learn by trying the controls. Example workouts stay separate from your account.</p></header>
    {error ? <div role="status" className="rounded border border-lavender p-3 text-sm text-fg"><p>{error}</p><HudButton className="mt-2" onClick={() => void retry()} variant="outline">Retry sync</HudButton></div> : null}
    <Panel accent="cyan"><h2 className="font-display text-lg font-bold text-fg">Try a workout and follow it through</h2><p className="mt-2 text-sm text-fg-muted">Log a set, edit it, finish, then explore History, Progress and Volume.</p><Link className="mt-4 inline-flex min-h-11 items-center rounded bg-cyan px-4 text-sm font-bold text-on-cyan" href="/help/demo">Try the example</Link></Panel>
    <Panel accent="lavender" eyebrow="Pick a lesson"><ul className="space-y-2">{demoLessons.map((lesson, index) => <li key={lesson.id}><Link className="flex min-h-12 items-center justify-between gap-3 rounded border border-outline-dim p-3 text-sm text-fg hover:border-cyan" href={`/help/demo?lesson=${lesson.id}`}><span>{index + 1}. {lesson.title}</span><span className="text-xs text-fg-muted">{onboarding?.steps[lessonFlag(lesson.id)] ? "Completed · Replay" : onboarding?.steps[lessonFlag(lesson.id, true)] ? "Skipped · Try it" : "Try it →"}</span></Link></li>)}</ul></Panel>
    <Panel accent="none" eyebrow="Explore at your own pace"><div className="flex flex-wrap gap-3">{[["history", "Example history"], ["progress", "Example Progress"], ["volume", "Example Volume"]].map(([path, label]) => <Link className="inline-flex min-h-11 items-center text-sm text-cyan" href={`/help/demo?explore=${path}`} key={path}>{label} →</Link>)}</div></Panel>
    <Panel accent="none" eyebrow="Quick reference"><dl className="space-y-3 text-sm text-fg-muted"><div><dt className="font-bold text-fg">Working and warmup sets</dt><dd>Working sets drive the progress chart and muscle volume. Warmups remain in History and summary totals.</dd></div><div><dt className="font-bold text-fg">RIR</dt><dd>Reps in reserve: how many clean repetitions you estimate remained.</dd></div><div><dt className="font-bold text-fg">Estimated 1RM</dt><dd>A calculated strength estimate for comparing trends, not an exact measurement.</dd></div></dl></Panel>
    <div className="flex flex-wrap gap-4 text-sm"><Link className="min-h-11 text-cyan" href="/privacy">Privacy and data</Link><Link className="min-h-11 text-cyan" href="/support">Support and status</Link></div>
  </div>;
}
