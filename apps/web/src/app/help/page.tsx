import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "../../features/auth/server-auth";
import { HelpScreen } from "../../features/onboarding/help-screen";
import { AppShell } from "../../features/shell/app-shell";

export const metadata = { title: "Help & Tutorial" };

export default async function HelpPage(): Promise<ReactNode> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <AppShell user={user}><HelpScreen /></AppShell>;
}
