"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { CockpitButton, CockpitErrorState } from "../shared/ui/cockpit";

interface AppErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AppError({ error, reset }: AppErrorProps): ReactNode {
  useEffect(() => {
    console.error("Unhandled client route error", error);
  }, [error]);

  const digest = error.digest ? `Fault digest: ${error.digest}` : null;

  return (
    <main className="appErrorPage">
      <CockpitErrorState
        action={
          <div className="appErrorActions">
            <CockpitButton onClick={reset}>RETRY_SYSTEM</CockpitButton>
            <Link className="cockpitButton cockpitButton--secondary" href="/">
              RETURN_HOME
            </Link>
          </div>
        }
        message={
          <>
            A client-side module stopped rendering. The error has been logged to
            the browser console for diagnosis.
            {digest ? <span className="appErrorDigest">{digest}</span> : null}
          </>
        }
        title="APPLICATION_FAULT"
      />
    </main>
  );
}
