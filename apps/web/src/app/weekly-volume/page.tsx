import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { WeeklyVolumePage } from "../../features/analytics/weekly-volume-page";
import { getCurrentUser } from "../../features/auth/server-auth";

export default async function WeeklyTrainingVolumePage(): Promise<ReactNode> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return <WeeklyVolumePage />;
}
