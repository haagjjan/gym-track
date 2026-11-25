import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { DemoSession } from "../../../features/onboarding/demo-session";
import { DemoHistory } from "../../../features/onboarding/demo-history";
import { DemoProgressScreen, DemoVolumeScreen } from "../../../features/onboarding/demo-analytics-screens";

const PAGES = new Set(["workout", "session", "history", "progress", "volume"]);

export default async function PublicDemoPage({ params }: {
  params: Promise<{ screen?: string[] }>;
}): Promise<ReactNode> {
  const { screen = [] } = await params;
  const page = screen[0] ?? "session";

  if (!PAGES.has(page) || screen.length > (page === "history" ? 2 : 1)) {
    notFound();
  }

  if (page === "history") return <DemoHistory basePath="/demo" workoutId={screen[1]} />;
  if (page === "progress") return <DemoProgressScreen />;
  if (page === "volume") return <DemoVolumeScreen basePath="/demo" />;
  return <DemoSession basePath="/demo" />;
}
