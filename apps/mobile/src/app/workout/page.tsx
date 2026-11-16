"use client";

import type { ReactNode } from "react";
import { LaunchScreen } from "../../../../web/src/features/launch/launch-screen";
import { AppShell } from "../../../../web/src/features/shell/app-shell";
import { Authed } from "../../session/session";

export default function WorkoutPage(): ReactNode {
  return (
    <Authed>
      {(user) => (
        <AppShell user={user}>
          <LaunchScreen />
        </AppShell>
      )}
    </Authed>
  );
}
