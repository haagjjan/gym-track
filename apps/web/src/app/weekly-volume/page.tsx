import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { WeeklyVolumePage } from "../../features/analytics/weekly-volume-page";
import { getCurrentUser } from "../../features/auth/server-auth";
import { AppCockpitShell } from "../../features/navigation/app-cockpit-shell";

export default async function WeeklyTrainingVolumePage(): Promise<ReactNode> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AppCockpitShell user={user}>
      <WeeklyVolumePage />
    </AppCockpitShell>
  );
}
