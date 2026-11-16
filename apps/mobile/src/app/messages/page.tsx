"use client";

import type { ReactNode } from "react";
import { MessageInbox } from "../../../../web/src/features/messages/message-inbox";
import { AppShell } from "../../../../web/src/features/shell/app-shell";
import { Authed } from "../../session/session";

export default function MessagesPage(): ReactNode {
  return (
    <Authed>
      {(user) => (
        <AppShell user={user}>
          <section className="mx-auto max-w-2xl px-4 pb-8 pt-4">
            <h1 className="text-title-1 text-text">Messages</h1>
            <p className="mb-6 mt-2 text-subhead text-text-secondary">
              Notes from the GymTrack team and service notices. Dismissed messages stay here.
            </p>
            <MessageInbox />
          </section>
        </AppShell>
      )}
    </Authed>
  );
}
