import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "../../../features/auth/server-auth";
import { AppShell } from "../../../features/shell/app-shell";
import { TemplatesScreen } from "../../../features/templates/templates-screen";

export const metadata = { title: "Workout Templates" };

export default async function TemplatesPage({ searchParams }: { searchParams: Promise<{ template?: string }> }): Promise<ReactNode> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { template } = await searchParams;
  const initialTemplateId = template && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(template) ? template : undefined;
  return <AppShell user={user}><TemplatesScreen initialTemplateId={initialTemplateId} key={initialTemplateId ?? "list"} userId={user.id} /></AppShell>;
}
