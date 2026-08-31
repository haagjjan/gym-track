import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminScreen } from "../../features/admin/admin-screen";
import { getCurrentUser } from "../../features/auth/server-auth";
import { AppShell } from "../../features/shell/app-shell";

export const metadata = { title: "Administration" };

export default async function AdminPage(): Promise<ReactNode> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/");
  return <AppShell user={user}><AdminScreen /></AppShell>;
}
