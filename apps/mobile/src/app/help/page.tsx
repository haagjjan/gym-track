"use client";

import type { ReactNode } from "react";
import { HelpScreen } from "../../../../web/src/features/onboarding/help-screen";
import { AppShell } from "../../../../web/src/features/shell/app-shell";
import { appConfig } from "../../config";
import { Authed } from "../../session/session";

export default function HelpPage(): ReactNode {
  return (
    <Authed>
      {(user) => (
        <AppShell user={user}>
          <HelpScreen extendedTracking={appConfig.extendedTracking} />
        </AppShell>
      )}
    </Authed>
  );
}
