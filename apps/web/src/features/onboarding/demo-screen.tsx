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
    router.push(index === 0 ? "/help/demo" : `/help/demo/${demoLessons[index]?.path ?? ""}`);
  }
  function start(template: boolean): void {
    setState((current) => ({ ...current, practice: practiceWorkout(Date.now(), template) }));
    record("started");
    router.push("/help/demo/session");
  }
  if (!state.entered) return <div className="mx-auto max-w-3xl space-y-4 px-4 py-4 lg:px-6">
    <p className="text-subhead text-text-secondary">Example data, separate from your account</p>
    <h1 className="text-title-1 text-text">Learn by trying it</h1>
    <p className="text-body text-text-secondary">Use the workout controls, then see what your logs reveal in Progress and Volume. Take it one step at a time.</p>
    <section className="rounded-[var(--radius-card)] bg-surface p-4"><h2 className="text-title-3 text-text">{lesson ? demoLessons[targetLesson]!.title : "A workout, from start to insight"}</h2>
      <p className="mt-2 text-body text-text-secondary">Eight example workouts are ready to explore. The example resets when you reload or exit, and you can restart here any time.</p>
      <div className="mt-4 flex flex-col gap-2"><Button onClick={() => begin(targetLesson)}>{lesson ? "Start this lesson" : "Start guided example"}</Button><Button onClick={() => { void mark("demoInvitationHandled"); setState((current) => ({ ...current, entered: true, lesson: null })); router.push(`/help/demo/${exploreTarget}`); }} variant="secondary">Explore freely</Button></div>
    </section>
    <Link className={buttonClass("plain", "compact")} href="/">Exit example</Link>
  </div>;
  return <><DemoGuide />
    {page === "home" ? <div className="mx-auto max-w-3xl space-y-4 px-4 py-4 lg:px-6">
      {state.lesson === 0 ? <section className="rounded-[var(--radius-card)] bg-surface p-4"><h1 className="text-title-1 text-text">Start with Workout</h1><p className="mt-2 text-body text-text-secondary">Workout is in the center of the mobile tabs or at the bottom of the desktop sidebar.</p><Link className={`${buttonClass("primary")} mt-4 w-full`} href="/help/demo/workout">Open workout</Link></section> : <>
        <h1 className="text-title-1 text-text">{state.lesson === demoLessons.length ? "Example walkthrough finished" : "Explore the example"}</h1>
        <p className="text-body text-text-secondary">Try any feature again. Your example workouts stay here until you exit.</p><DemoCopyTemplate />
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface">{[["history", "History"], ["progress", "Progress"], ["volume", "Volume"]].map(([path, label]) => <li key={path}><Link className="flex min-h-11 items-center gap-3 px-4 py-2 text-body text-text active:bg-surface-raised" href={`/help/demo/${path}`}><span className="min-w-0 flex-1">{label}</span><IconForward className="shrink-0 text-text-muted" /></Link></li>)}</ul>
        <Button onClick={() => begin(0)} variant="secondary">Replay guided example</Button>
      </>}
    </div> : page === "workout" ? <div className="mx-auto max-w-3xl space-y-4 px-4 py-4 lg:px-6"><h1 className="text-title-1 text-text">Start a workout</h1>
      {state.practice?.isOpen ? <Link className={buttonClass("primary")} href="/help/demo/session">Resume example workout</Link> :
        <WorkoutLaunchChoices templatesHref={null} templates={[demoTemplate]} error={null} isLoading={false} onRetry={() => undefined} onScratch={() => start(false)} onStart={() => start(true)} pendingChoice={null} />}
    </div> : page === "session" ? <DemoSession /> : page === "history" ? <DemoHistory workoutId={workoutId} /> : page === "progress" ? <DemoProgressScreen /> : <DemoVolumeScreen />}
  </>;
}
