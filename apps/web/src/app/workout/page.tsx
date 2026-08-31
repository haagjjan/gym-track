import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "../../features/auth/server-auth";
import { LaunchScreen } from "../../features/launch/launch-screen";
import { AppShell } from "../../features/shell/app-shell";

export const metadata = { title: "Start a workout" };

export default async function WorkoutStartPage(): Promise<ReactNode> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell user={user}>
      <LaunchScreen />
    </AppShell>
  );
}
