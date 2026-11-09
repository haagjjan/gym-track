"use client";

import type { ReactNode } from "react";
import { Button } from "../shared/ui/button";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): ReactNode {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg p-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-title-1 text-text">Something went wrong</h1>
        <p className="mt-3 break-words text-body text-text-secondary">
          {error.message || "An unexpected error interrupted the app. Try again."}
        </p>
        <Button className="mt-6 w-full" onClick={reset}>Try again</Button>
      </div>
    </main>
  );
}
