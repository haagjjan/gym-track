import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AnalyticsDashboard } from "../../features/analytics/analytics-dashboard";
import { getCurrentUser } from "../../features/auth/server-auth";

export default async function AnalyticsPage(): Promise<ReactNode> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return <AnalyticsDashboard />;
}
