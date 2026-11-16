"use client";

import type { ReactNode } from "react";
import { AppShell } from "../../../../web/src/features/shell/app-shell";
import { VolumeScreen } from "../../../../web/src/features/volume/volume-screen";
import { Authed } from "../../session/session";

export default function WeeklyVolumePage(): ReactNode {
  return (
    <Authed>
      {(user) => (
        <AppShell user={user}>
          <VolumeScreen />
        </AppShell>
      )}
    </Authed>
  );
}
