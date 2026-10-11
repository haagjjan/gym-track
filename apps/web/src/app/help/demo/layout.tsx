import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../features/auth/server-auth";
import { AppShell } from "../../../features/shell/app-shell";
import { DemoProvider } from "../../../features/onboarding/demo-provider";

export const metadata = { title: "Hands-on example" };
export default async function DemoLayout({ children }: { children: ReactNode }): Promise<ReactNode> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <AppShell demo user={user}><DemoProvider key={user.id}>{children}</DemoProvider></AppShell>;
}
