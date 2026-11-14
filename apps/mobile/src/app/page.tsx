"use client";

import type { ReactNode } from "react";
import { DashboardScreen } from "../../../web/src/features/dashboard/dashboard-screen";
import { AppShell } from "../../../web/src/features/shell/app-shell";
import { Authed } from "../session/session";

export default function HomePage(): ReactNode {
  return (
    <Authed>
      {(user) => (
        <AppShell user={user}>
          <DashboardScreen user={user} />
        </AppShell>
      )}
    </Authed>
  );
}
