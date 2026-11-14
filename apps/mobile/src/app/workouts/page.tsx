"use client";

import type { ReactNode } from "react";
import { HistoryScreen } from "../../../../web/src/features/history/history-screen";
import { AppShell } from "../../../../web/src/features/shell/app-shell";
import { appConfig } from "../../config";
import { Authed } from "../../session/session";

export default function WorkoutsPage(): ReactNode {
  return (
    <Authed>
      {(user) => (
        <AppShell user={user}>
          <HistoryScreen extendedTracking={appConfig.extendedTracking} userId={user.id} />
        </AppShell>
      )}
    </Authed>
  );
}
