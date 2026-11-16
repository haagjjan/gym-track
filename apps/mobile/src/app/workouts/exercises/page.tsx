"use client";

import type { ReactNode } from "react";
import { ExercisesScreen } from "../../../../../web/src/features/exercises/exercises-screen";
import { AppShell } from "../../../../../web/src/features/shell/app-shell";
import { Authed } from "../../../session/session";

export default function ExercisesPage(): ReactNode {
  return (
    <Authed>
      {(user) => (
        <AppShell user={user}>
          <ExercisesScreen userId={user.id} />
        </AppShell>
      )}
    </Authed>
  );
}
