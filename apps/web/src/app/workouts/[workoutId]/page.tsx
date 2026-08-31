import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "../../../features/auth/server-auth";
import { SessionScreen } from "../../../features/session/session-screen";

export const metadata = { title: "Workout" };

interface SessionPageProps {
  params: Promise<{ workoutId: string }>;
  searchParams: Promise<{ focusName?: string }>;
}

// Focused fullscreen flow: no app shell, one job — log sets.
export default async function SessionPage({ params, searchParams }: SessionPageProps): Promise<ReactNode> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { workoutId } = await params;
  const query = await searchParams;

  return <SessionScreen focusName={query.focusName === "1"} userId={user.id} workoutId={workoutId} />;
}
