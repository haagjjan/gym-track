"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { apiFetch } from "../../shared/api/client";
import { PUBLIC_PRIVACY_VERSION, PUBLIC_TERMS_VERSION } from "../../shared/public-policy";
import { HudButton } from "../../shared/ui/ui";

export function WaitlistForm(): ReactNode {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setState("sending");
    const data = new FormData(event.currentTarget);
    try {
      await apiFetch("/api/beta/waitlist", {
        method: "POST",
        body: {
          email: String(data.get("email") ?? "").trim(),
          adultAttested: true,
          termsVersion: PUBLIC_TERMS_VERSION,
          privacyVersion: PUBLIC_PRIVACY_VERSION
        }
      });
      setState("sent");
    } catch {
      setState("failed");
    }
  }

  if (state === "sent") {
    return <p className="rounded border border-green/40 bg-green/5 p-4 text-sm text-green">Request received. If selected, you will receive a single-use invitation by email.</p>;
  }

  return (
    <form className="space-y-4" onSubmit={(event) => void submit(event)}>
      <label className="block"><span className="label-caps text-outline">EMAIL_ADDRESS</span><input autoComplete="email" className="mt-1.5 min-h-11 w-full rounded border border-outline-dim bg-surface-low px-3 text-fg" name="email" required type="email" /></label>
      <label className="flex gap-3 text-xs text-fg-muted"><input className="mt-0.5 size-4" required type="checkbox" /><span>I confirm that I am at least 18 years old and resident in Switzerland.</span></label>
      <label className="flex gap-3 text-xs text-fg-muted"><input className="mt-0.5 size-4" required type="checkbox" /><span>I have read the <a className="text-cyan" href="/privacy" target="_blank">Privacy Notice</a>, including how this request is stored.</span></label>
      <label className="flex gap-3 text-xs text-fg-muted"><input className="mt-0.5 size-4" required type="checkbox" /><span>I accept the <a className="text-cyan" href="/terms" target="_blank">Founding Beta Terms</a>.</span></label>
      {state === "failed" ? <p className="text-xs text-red" role="alert">The request could not be submitted. Try again shortly.</p> : null}
      <HudButton className="w-full" disabled={state === "sending"} type="submit">{state === "sending" ? "SENDING…" : "REQUEST_FOUNDING_ACCESS"}</HudButton>
    </form>
  );
}
