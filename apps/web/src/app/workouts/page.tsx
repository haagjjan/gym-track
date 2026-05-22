import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "../../features/auth/server-auth";
import { WorkoutHistory } from "../../features/workouts/workout-history";

export default async function WorkoutsPage(): Promise<ReactNode> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return <WorkoutHistory />;
}
