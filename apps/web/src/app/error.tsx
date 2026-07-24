"use client";

import type { ReactNode } from "react";
import { HudButton } from "../shared/ui/ui";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): ReactNode {
  return (
    <main className="hud-grid flex min-h-dvh items-center justify-center bg-void p-6">
      <div className="glass chamfer max-w-md rounded-xl p-8 text-center">
        <p className="label-caps text-red">SYSTEM_FAULT</p>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-fg">
          Something broke in Gym Progress Tracker
        </h1>
        <p className="mt-3 break-words text-xs leading-relaxed text-fg-muted">
          {error.message || "An unexpected error interrupted the session."}
        </p>
        <HudButton className="mt-5" onClick={reset} variant="outline">
          REINITIALIZE
        </HudButton>
      </div>
    </main>
  );
}
