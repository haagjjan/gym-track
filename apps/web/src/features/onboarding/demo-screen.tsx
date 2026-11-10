"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Button, buttonClass } from "../../shared/ui/button";
import { IconForward } from "../../shared/ui/icons";
import { WorkoutLaunchChoices } from "../launch/launch-screen";
import { demoTemplate, practiceWorkout } from "./demo-data";
import { demoLessons } from "./demo-lessons";
import { prepareLesson } from "./demo-state";
import { useOnboarding } from "./use-onboarding";
import { useDemo } from "./demo-provider";
import { DemoGuide } from "./demo-guide";
import { DemoSession } from "./demo-session";
import { DemoHistory } from "./demo-history";
import { DemoProgressScreen, DemoVolumeScreen } from "./demo-analytics-screens";
import { DemoCopyTemplate } from "./demo-copy-template";

export function DemoScreen({ page, workoutId, lesson, explore }: {
  page: string; workoutId?: string | undefined; lesson?: string | undefined; explore?: string | undefined;
}): ReactNode {
  const { state, setState, record } = useDemo();
  const router = useRouter();
  const { mark } = useOnboarding();
  const targetLesson = Math.max(0, demoLessons.findIndex((item) => item.id === lesson));
  const exploreTarget = ["history", "progress", "volume"].includes(explore ?? "") ? explore! : ["history", "progress", "volume"].includes(page) ? page : "history";
  function begin(index: number): void {
    void mark("demoInvitationHandled");
    setState((current) => prepareLesson(current, index));
    router.push(`/help/demo/${demoLessons[index]?.path ?? ""}`);
  }
  function start(template: boolean): void {
    setState((current) => ({ ...current, practice: practiceWorkout(Date.now(), template) }));
    record("started");
    router.push("/help/demo/session");
  }
  if (!state.entered) return <div className="mx-auto max-w-3xl space-y-4 px-4 py-4 lg:px-6">
    <h1 className="text-large-title text-text">{lesson ? demoLessons[targetLesson]!.title : "See how it works"}</h1>
    <section className="rounded-[var(--radius-card)] bg-surface p-4">
      <p className="text-body text-text">{lesson ? "Try this step in an example workout." : "Log one set in an example workout and see it show up in Progress and Volume. Takes about a minute."}</p>
      <p className="mt-1 text-subhead text-text-secondary">Example data only. Your account isn&apos;t touched.</p>
      <Button className="mt-4 w-full" onClick={() => begin(targetLesson)}>{lesson ? "Start this step" : "Start the tour"}</Button>
      <Button className="mt-2 w-full" onClick={() => { void mark("demoInvitationHandled"); setState((current) => ({ ...current, entered: true, lesson: null })); router.push(`/help/demo/${exploreTarget}`); }} variant="plain">Explore on my own</Button>
    </section>
  </div>;
  const finished = state.lesson === demoLessons.length;
  return <><DemoGuide />
    {page === "home" ? <div className="mx-auto max-w-3xl space-y-4 px-4 py-4 lg:px-6">
      <h1 className="text-large-title text-text">{finished ? "You’re set" : "Example"}</h1>
      {finished ? <p className="text-body text-text-secondary">That&apos;s the loop: log sets, finish, and Progress and Volume update by themselves.</p> : null}
      <DemoCopyTemplate />
      <section>
        <h2 className="mb-2 px-4 text-subhead text-text-secondary">Look around the example</h2>
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface">{[["history", "History"], ["progress", "Progress"], ["volume", "Volume"]].map(([path, label]) => <li key={path}><Link className="flex min-h-11 items-center gap-3 px-4 py-2 text-body text-text active:bg-surface-raised" href={`/help/demo/${path}`}><span className="min-w-0 flex-1">{label}</span><IconForward className="shrink-0 text-text-muted" /></Link></li>)}</ul>
      </section>
      <Button className="w-full" onClick={() => begin(0)} variant="plain">Take the tour again</Button>
    </div> : page === "workout" ? <div className="mx-auto max-w-3xl space-y-4 px-4 py-4 lg:px-6"><h1 className="text-title-1 text-text">Start a workout</h1>
      {state.practice?.isOpen ? <Link className={buttonClass("primary")} href="/help/demo/session">Resume example workout</Link> :
        <WorkoutLaunchChoices templatesHref={null} templates={[demoTemplate]} error={null} isLoading={false} onRetry={() => undefined} onScratch={() => start(false)} onStart={() => start(true)} pendingChoice={null} />}
    </div> : page === "session" ? <DemoSession /> : page === "history" ? <DemoHistory workoutId={workoutId} /> : page === "progress" ? <DemoProgressScreen /> : <DemoVolumeScreen />}
  </>;
}
