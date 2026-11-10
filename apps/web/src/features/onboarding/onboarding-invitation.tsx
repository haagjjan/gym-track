"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Button, buttonClass } from "../../shared/ui/button";
import { useOnboarding } from "./use-onboarding";

export function OnboardingInvitation(): ReactNode {
  const { onboarding, mark } = useOnboarding();
  if (!onboarding || onboarding.steps.demoInvitationHandled) return null;
  return <section aria-label="Try the example" className="relative z-20 mx-4 mt-2 rounded-[var(--radius-card)] bg-surface p-4 lg:mx-6">
    <h2 className="text-title-3 text-text">New here? Take the 1-minute tour</h2>
    <p className="mt-1 text-subhead text-text-secondary">Log a set in an example workout and see where it shows up. Your account isn&apos;t touched.</p>
    <div className="mt-3 flex items-center gap-2">
      <Link className={`${buttonClass("primary", "compact")} flex-1`} href="/help/demo" onClick={() => void mark("demoInvitationHandled")}>Take the tour</Link>
      <Button onClick={() => void mark("demoInvitationHandled")} size="compact" variant="plain">Not now</Button>
    </div>
  </section>;
}
