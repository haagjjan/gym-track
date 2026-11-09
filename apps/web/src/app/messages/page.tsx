import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "../../features/auth/server-auth";
import { MessageInbox } from "../../features/messages/message-inbox";
import { AppShell } from "../../features/shell/app-shell";

export const metadata = { title: "Messages" };

export default async function MessagesPage(): Promise<ReactNode> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <AppShell user={user}>
      <section className="mx-auto max-w-2xl px-4 pb-8 pt-4">
        <h1 className="text-title-1 text-text">Messages</h1>
        <p className="mb-6 mt-2 text-subhead text-text-secondary">Notes from the GymTrack team and service notices. Dismissed messages stay here.</p>
        <MessageInbox />
      </section>
    </AppShell>
  );
}
