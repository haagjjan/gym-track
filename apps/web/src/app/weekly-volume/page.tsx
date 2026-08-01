import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "../../features/auth/server-auth";
import { AppShell } from "../../features/shell/app-shell";
import { VolumeScreen } from "../../features/volume/volume-screen";

export const metadata = { title: "Volume" };

export default async function WeeklyVolumePage(): Promise<ReactNode> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell user={user}>
      <VolumeScreen />
    </AppShell>
  );
}
