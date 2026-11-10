"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { apiFetch } from "../../shared/api/client";
import { Button, buttonClass } from "../../shared/ui/button";
import { AuthFrame, FormError } from "./auth-frame";

type CancelState = "idle" | "pending" | "cancelled" | "cancelled_unnotified" | "failed";

export function CancelDeletionScreen({ token }: { token: string }): ReactNode {
  const [state, setState] = useState<CancelState>("idle");

  async function cancel(): Promise<void> {
    setState("pending");

    try {
      const result = await apiFetch<{ notificationStatus: "FAILED" | "SENT" }>(
        "/api/users/me/deletion/cancel",
        { method: "POST", body: { token } }
      );
      setState(result.notificationStatus === "SENT" ? "cancelled" : "cancelled_unnotified");
    } catch {
      setState("failed");
    }
  }

  const cancelled = state === "cancelled" || state === "cancelled_unnotified";

  return (
    <AuthFrame backHref="/login" title="Cancel account deletion">
      {cancelled ? (
        <div className="mt-6 space-y-4">
          <p className="text-body text-text" role="status">
            Deletion was cancelled. You can sign in normally.
          </p>
          {state === "cancelled_unnotified" ? (
            <p className="text-subhead text-text-secondary">
              We couldn&apos;t send the confirmation email, but your cancellation is complete.
            </p>
          ) : null}
          <Link className={`${buttonClass("primary")} w-full`} href="/login">
            Back to sign in
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <p className="text-body text-text-secondary">
            Cancel the deletion before the deadline to keep your personal bests and workout history.
          </p>
          {!token ? (
            <FormError>This link is incomplete. Open the link from your email again.</FormError>
          ) : null}
          {state === "failed" ? (
            <FormError>
              This link is invalid or has expired. If the deadline hasn&apos;t passed yet, contact support right away.
            </FormError>
          ) : null}
          <Button className="w-full" disabled={state === "pending" || !token} onClick={() => void cancel()}>
            {state === "pending" ? "Cancelling…" : "Keep my account"}
          </Button>
        </div>
      )}
    </AuthFrame>
  );
}
