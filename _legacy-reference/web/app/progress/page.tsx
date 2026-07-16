import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ProgressPage } from "../../features/analytics/progress-page";
import { getCurrentUser } from "../../features/auth/server-auth";
import { AppCockpitShell } from "../../features/navigation/app-cockpit-shell";

export default async function ExerciseProgressPage(): Promise<ReactNode> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AppCockpitShell user={user}>
      <ProgressPage />
    </AppCockpitShell>
  );
}
