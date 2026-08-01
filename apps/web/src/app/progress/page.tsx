import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "../../features/auth/server-auth";
import { ProgressScreen } from "../../features/progress/progress-screen";
import { AppShell } from "../../features/shell/app-shell";

export const metadata = { title: "Progress" };

export default async function ProgressPage(): Promise<ReactNode> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell user={user}>
      <ProgressScreen />
    </AppShell>
  );
}
