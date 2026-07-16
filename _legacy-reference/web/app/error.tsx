"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { CockpitButton, CockpitErrorState } from "../shared/ui/cockpit";
import {
  logClientDiagnosticGroup,
  readClientDiagnostics,
  recordClientDiagnostic,
  sanitizeDiagnosticRoute
} from "../shared/client-diagnostics";

interface AppErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AppError({ error, reset }: AppErrorProps): ReactNode {
  const pathname = usePathname();

  useEffect(() => {
    const diagnostic = recordClientDiagnostic({
      digest: error.digest,
      event: "client_route_error",
      message: error.message,
      route: sanitizeDiagnosticRoute(pathname),
      stack: error.stack
    });

    logClientDiagnosticGroup("[client diagnostics] route error", {
      diagnostic,
      recentDiagnostics: readClientDiagnostics()
    });
  }, [error, pathname]);

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
