"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, type ReactNode } from "react";
import { OnboardingProvider } from "../../../../../web/src/features/onboarding/onboarding-provider";
import { SessionScreen } from "../../../../../web/src/features/session/session-screen";
import { appConfig } from "../../../config";
import { Authed } from "../../../session/session";

/** One workout, addressed as /workouts/session/?id=<workoutId> (ADR 0024). */
function Session(): ReactNode {
  const router = useRouter();
  const query = useSearchParams();
  const workoutId = query.get("id");

  useEffect(() => {
    if (!workoutId) {
      router.replace("/workouts/");
    }
  }, [router, workoutId]);

  if (!workoutId) {
    return null;
  }

  return (
    <Authed>
      {(user) => (
        <OnboardingProvider userId={user.id}>
          <SessionScreen
            extendedTracking={appConfig.extendedTracking}
            focusName={query.get("focusName") === "1"}
            key={workoutId}
            userId={user.id}
            workoutId={workoutId}
          />
        </OnboardingProvider>
      )}
    </Authed>
  );
}

export default function SessionPage(): ReactNode {
  return <Suspense fallback={null}><Session /></Suspense>;
}
