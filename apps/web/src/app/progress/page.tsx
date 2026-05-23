import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ProgressPage } from "../../features/analytics/progress-page";
import { getCurrentUser } from "../../features/auth/server-auth";

export default async function ExerciseProgressPage(): Promise<ReactNode> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return <ProgressPage />;
}
