import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { DemoScreen } from "../../../../features/onboarding/demo-screen";

export default async function DemoPage({ params, searchParams }: {
  params: Promise<{ screen?: string[] }>; searchParams: Promise<{ lesson?: string; explore?: string }>;
}): Promise<ReactNode> {
  const { screen = [] } = await params;
  const query = await searchParams;
  const page = screen[0] ?? "home";
  if (!["home", "workout", "session", "history", "progress", "volume"].includes(page) || screen.length > (page === "history" ? 2 : 1)) notFound();
  return <DemoScreen page={page} workoutId={screen[1]} lesson={query.lesson} explore={query.explore} />;
}
