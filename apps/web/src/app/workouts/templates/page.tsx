import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "../../../features/auth/server-auth";
import { AppShell } from "../../../features/shell/app-shell";
import { TemplatesScreen } from "../../../features/templates/templates-screen";

export const metadata = { title: "Workout Templates" };

export default async function TemplatesPage(): Promise<ReactNode> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <AppShell user={user}><TemplatesScreen userId={user.id} /></AppShell>;
}
