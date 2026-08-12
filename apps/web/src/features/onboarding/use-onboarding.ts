"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../shared/api/client";

export interface OnboardingState { version: number; steps: Record<string, boolean>; }

export function useOnboarding(): { onboarding: OnboardingState | null; mark: (step: string) => Promise<void>; resetTour: () => Promise<void> } {
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  useEffect(() => {
    let active = true;
    void apiFetch<{ onboarding: OnboardingState }>("/api/users/me/onboarding")
      .then((result) => { if (active) setOnboarding(result.onboarding); }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  const save = useCallback(async (next: OnboardingState): Promise<void> => {
    const result = await apiFetch<{ onboarding: OnboardingState }>("/api/users/me/onboarding", { method: "PATCH", body: next });
    setOnboarding(result.onboarding);
  }, []);
  // Progress flags are best effort, and every caller fires this without awaiting
  // it. A write that fails — offline, or a request cut short by navigating away
  // — must not escape as an uncaught rejection; the step simply stays unmarked
  // and is retried the next time the screen mounts.
  const mark = useCallback(async (step: string): Promise<void> => {
    if (onboarding && !onboarding.steps[step]) {
      await save({ ...onboarding, steps: { ...onboarding.steps, [step]: true } })
        .catch(() => undefined);
    }
  }, [onboarding, save]);
  const resetTour = useCallback(async (): Promise<void> => {
    if (onboarding) await save({ ...onboarding, steps: { ...onboarding.steps, tour: false } });
  }, [onboarding, save]);
  return {
    onboarding,
    mark,
    resetTour
  };
}
