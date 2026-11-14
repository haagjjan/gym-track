import type { ReactNode } from "react";

/** Shown when the API no longer serves this app version (ADR 0024). */
export default function UpdatePage(): ReactNode {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
      <h1 className="text-title-2 text-text">Update GymTrack</h1>
      <p className="text-body text-text-secondary">
        This version is no longer supported. Install the latest version from the store to keep going.
        Workouts saved on this phone stay here.
      </p>
    </main>
  );
}
