"use client";

import type { ReactNode } from "react";
import { SettingsScreen } from "../../../../web/src/features/settings/settings-screen";
import { AppShell } from "../../../../web/src/features/shell/app-shell";
import { appConfig } from "../../config";
import { Authed } from "../../session/session";

export default function SettingsPage(): ReactNode {
  return (
    <Authed>
      {(user) => (
        <AppShell user={user}>
          <SettingsScreen supportUrl={appConfig.supportUrl} user={user} />
        </AppShell>
      )}
    </Authed>
  );
}
