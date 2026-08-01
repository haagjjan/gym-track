import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "../features/auth/server-auth";
import { DashboardScreen } from "../features/dashboard/dashboard-screen";
import { AppShell } from "../features/shell/app-shell";

export default async function HomePage(): Promise<ReactNode> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell user={user}>
      <DashboardScreen user={user} />
    </AppShell>
  );
}
