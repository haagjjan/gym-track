"use client";

import { useEffect, type ReactNode } from "react";
import {
  currentDiagnosticRoute,
  logClientDiagnosticGroup,
  readClientDiagnostics,
  recordClientDiagnostic
} from "../shared/client-diagnostics";

export function ClientDiagnosticsListener(): ReactNode {
  useEffect(() => {
    function handleError(event: ErrorEvent): void {
      const diagnostic = recordClientDiagnostic({
        event: "client_unhandled_error",
        filename: event.filename || undefined,
        line: event.lineno || undefined,
        message: event.message,
        route: currentDiagnosticRoute(),
        stack: event.error instanceof Error ? event.error.stack : undefined
      });

      logClientDiagnosticGroup("[client diagnostics] unhandled error", {
        diagnostic,
        recentDiagnostics: readClientDiagnostics()
      });
    }

    function handleRejection(event: PromiseRejectionEvent): void {
      const reason = event.reason;
      const diagnostic = recordClientDiagnostic({
        event: "client_unhandled_rejection",
        message: reason instanceof Error ? reason.message : String(reason),
        route: currentDiagnosticRoute(),
        stack: reason instanceof Error ? reason.stack : undefined
      });

      logClientDiagnosticGroup("[client diagnostics] unhandled rejection", {
        diagnostic,
        recentDiagnostics: readClientDiagnostics()
      });
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
