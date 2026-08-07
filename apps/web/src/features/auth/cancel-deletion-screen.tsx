"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { apiFetch } from "../../shared/api/client";
import { HudButton } from "../../shared/ui/ui";

export function CancelDeletionScreen({ token }: { token: string }): ReactNode {
  const [state, setState] = useState<"idle" | "pending" | "cancelled" | "cancelled_unnotified" | "failed">("idle");
  async function cancel(): Promise<void> {
    setState("pending");
    try {
      const result = await apiFetch<{ notificationStatus: "FAILED" | "SENT" }>("/api/users/me/deletion/cancel", { method: "POST", body: { token } });
      setState(result.notificationStatus === "SENT" ? "cancelled" : "cancelled_unnotified");
    }
    catch { setState("failed"); }
  }
  const cancelled = state === "cancelled" || state === "cancelled_unnotified";
  return <main className="hud-grid flex min-h-dvh items-center justify-center bg-void p-5"><section className="glass-cyan max-w-md rounded-xl p-6 text-fg"><p className="label-caps text-cyan">ACCOUNT_RECOVERY</p><h1 className="mt-2 font-display text-2xl font-bold">Cancel account deletion</h1>{cancelled ? <><p className="mt-4 text-sm text-green">Deletion was cancelled. You can sign in normally.</p>{state === "cancelled_unnotified" ? <p className="mt-3 text-xs text-outline">The confirmation email could not be sent, but your cancellation is complete.</p> : null}<Link className="mt-5 inline-flex min-h-11 items-center text-cyan" href="/login">RETURN_TO_LOGIN</Link></> : <><p className="mt-3 text-sm text-fg-muted">Use this before the deadline to preserve your personal records and workout history.</p>{state === "failed" ? <p className="mt-3 text-xs text-red">This link is invalid or expired. Contact support immediately if the deadline has not passed.</p> : null}<HudButton className="mt-5 w-full" disabled={state === "pending" || !token} onClick={() => void cancel()}>{state === "pending" ? "CANCELLING…" : "KEEP MY ACCOUNT"}</HudButton></>}</section></main>;
}
