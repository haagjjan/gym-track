"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { DemoScreen } from "../../../../../../web/src/features/onboarding/demo-screen";

function DemoInner({ page }: { page: string }): ReactNode {
  const query = useSearchParams();
  return (
    <DemoScreen
      explore={query.get("explore") ?? undefined}
      lesson={query.get("lesson") ?? undefined}
      page={page}
      workoutId={query.get("workout") ?? undefined}
    />
  );
}

export function DemoPage({ page }: { page: string }): ReactNode {
  return (
    <Suspense fallback={null}>
      <DemoInner page={page} />
    </Suspense>
  );
}
