"use client";

import type { ReactNode } from "react";
import { Button } from "../../../../web/src/shared/ui/button";

/** Shown when the API no longer serves this app version (ADR 0024). */
export default function UpdatePage(): ReactNode {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 bg-bg pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pl-[max(1.5rem,env(safe-area-inset-left))] pr-[max(1.5rem,env(safe-area-inset-right))] pt-[calc(env(safe-area-inset-top)+1.5rem)] text-center">
      <h1 className="text-title-2 text-text">Update GymTrack</h1>
      <p className="text-body text-text-secondary">
        This version is no longer supported. Install the latest version from the store to keep going.
        Workouts saved on this phone stay here.
      </p>
      <Button className="mt-2 w-full" onClick={() => window.location.assign("/")}>
        Try again
      </Button>
    </main>
  );
}
