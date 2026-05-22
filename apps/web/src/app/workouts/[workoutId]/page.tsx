import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "../../../features/auth/server-auth";
import { WorkoutLogger } from "../../../features/workouts/workout-logger";

interface WorkoutPageProps {
  params: Promise<{
    workoutId: string;
  }>;
}

export default async function WorkoutPage({ params }: WorkoutPageProps): Promise<ReactNode> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { workoutId } = await params;

  return <WorkoutLogger workoutId={workoutId} />;
}
