"use client";

import type { ReactNode } from "react";
import { DemoProvider } from "../../../../../web/src/features/onboarding/demo-provider";
import { AppShell } from "../../../../../web/src/features/shell/app-shell";
import { Authed } from "../../../session/session";

export default function DemoLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <Authed>
      {(user) => (
        <AppShell demo user={user}>
          <DemoProvider key={user.id}>{children}</DemoProvider>
        </AppShell>
      )}
    </Authed>
  );
}
