"use client";

import type { ReactNode } from "react";
import { ProgressScreen } from "../../../../web/src/features/progress/progress-screen";
import { AppShell } from "../../../../web/src/features/shell/app-shell";
import { appConfig } from "../../config";
import { Authed } from "../../session/session";

export default function ProgressPage(): ReactNode {
  return (
    <Authed>
      {(user) => (
        <AppShell user={user}>
          <ProgressScreen extendedTracking={appConfig.extendedTracking} />
        </AppShell>
      )}
    </Authed>
  );
}
