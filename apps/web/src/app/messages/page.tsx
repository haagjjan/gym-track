import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "../../features/auth/server-auth";
import { MessageInbox } from "../../features/messages/message-inbox";
import { AppShell } from "../../features/shell/app-shell";

export const metadata = { title: "Messages" };

export default async function MessagesPage(): Promise<ReactNode> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <AppShell user={user}><section className="mx-auto max-w-3xl p-4 py-8 sm:p-8"><p className="label-caps text-cyan">Inbox</p><h1 className="mt-2 font-display text-3xl font-bold text-fg">Messages</h1><p className="mb-6 mt-2 text-sm text-fg-muted">Notes and questions from the GymTrack team, plus service notices. Dismissed messages stay here so you can read them again.</p><MessageInbox /></section></AppShell>;
}
