import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "../../features/auth/server-auth";
import { AppCockpitShell } from "../../features/navigation/app-cockpit-shell";
import { WorkoutStart } from "../../features/workouts/workout-start";

export default async function WorkoutStartPage(): Promise<ReactNode> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AppCockpitShell user={user}>
      <WorkoutStart />
    </AppCockpitShell>
  );
}
