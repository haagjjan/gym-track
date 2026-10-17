"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { HudButton, Panel } from "../../shared/ui/ui";
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
  if (!state.entered) return <div className="mx-auto max-w-3xl space-y-4 p-4 lg:p-6">
    <p className="text-sm text-cyan">Example data — separate from your account</p>
    <h1 className="font-display text-2xl font-bold text-fg">Learn by trying it</h1>
    <p className="text-sm text-fg-muted">Use the workout controls, then see what your logs reveal in Progress and Volume. Take it one step at a time.</p>
    <Panel accent="cyan"><h2 className="font-display text-lg font-bold text-fg">{lesson ? demoLessons[targetLesson]!.title : "A workout, from start to insight"}</h2>
      <p className="mt-2 text-sm text-fg-muted">Eight example logs are ready to explore. Practice resets when you reload or exit; you can restart here any time.</p>
      <div className="mt-4 flex flex-wrap gap-2"><HudButton onClick={() => begin(targetLesson)}>{lesson ? "Start this lesson" : "Start guided example"}</HudButton><HudButton onClick={() => { void mark("demoInvitationHandled"); setState((current) => ({ ...current, entered: true, lesson: null })); router.push(`/help/demo/${exploreTarget}`); }} variant="outline">Explore freely</HudButton></div>
    </Panel>
    <Link className="inline-flex min-h-11 items-center text-sm text-fg-muted" href="/">Exit example →</Link>
  </div>;
  return <><DemoGuide />
    {page === "home" ? <div className="mx-auto max-w-3xl space-y-4 p-4 lg:p-6">
      {state.lesson === 0 ? <Panel accent="cyan"><h1 className="font-display text-2xl font-bold text-fg">Start with Workout</h1><p className="mt-2 text-sm text-fg-muted">Workout is in the center of the mobile tabs or at the bottom of the desktop sidebar.</p><Link className="mt-3 inline-flex min-h-11 items-center rounded border border-cyan px-4 text-sm text-cyan" href="/help/demo/workout">Open Workout →</Link></Panel> : <>
        <h1 className="font-display text-2xl font-bold text-fg">{state.lesson === demoLessons.length ? "Example walkthrough finished" : "Explore the example"}</h1>
        <p className="text-sm text-fg-muted">Try any feature again. Your example logs stay here until you exit.</p><DemoCopyTemplate />
        <div className="flex flex-wrap gap-4">{["history", "progress", "volume"].map((path) => <Link className="inline-flex min-h-11 items-center text-sm capitalize text-cyan" href={`/help/demo/${path}`} key={path}>{path} →</Link>)}</div>
        <HudButton onClick={() => begin(0)} variant="outline">Replay guided example</HudButton>
      </>}
    </div> : page === "workout" ? <div className="mx-auto max-w-3xl space-y-4 p-4 lg:p-6"><h1 className="font-display text-2xl font-bold text-fg">Start a workout</h1>
      {state.practice?.isOpen ? <Link className="inline-flex min-h-11 items-center text-cyan" href="/help/demo/session">Resume example workout →</Link> :
        <WorkoutLaunchChoices templatesHref={null} templates={[demoTemplate]} error={null} isLoading={false} onRetry={() => undefined} onScratch={() => start(false)} onStart={() => start(true)} pendingChoice={null} />}
    </div> : page === "session" ? <DemoSession /> : page === "history" ? <DemoHistory workoutId={workoutId} /> : page === "progress" ? <DemoProgressScreen /> : <DemoVolumeScreen />}
  </>;
}
