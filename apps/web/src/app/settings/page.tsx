import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "../../features/auth/server-auth";
import { SettingsScreen } from "../../features/settings/settings-screen";
import { AppShell } from "../../features/shell/app-shell";

export const metadata = { title: "Settings" };

export default async function SettingsPage(): Promise<ReactNode> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Read here rather than in the client tree, where it would be inlined at
  // build time and could never be configured at runtime.
  const supportUrl = process.env.SUPPORT_URL;

  return (
    <AppShell user={user}>
      <SettingsScreen supportUrl={supportUrl} user={user} />
    </AppShell>
  );
}
