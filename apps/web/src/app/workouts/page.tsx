import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "../../features/auth/server-auth";
import { HistoryScreen } from "../../features/history/history-screen";
import { AppShell } from "../../features/shell/app-shell";

export const metadata = { title: "History" };

export default async function WorkoutsPage(): Promise<ReactNode> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell user={user}>
      <HistoryScreen extendedTracking={process.env.ENABLE_EXTENDED_TRACKING === "true"} userId={user.id} />
    </AppShell>
  );
}
