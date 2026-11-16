"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { CancelDeletionScreen } from "../../../../web/src/features/auth/cancel-deletion-screen";

function CancelDeletion(): ReactNode {
  const query = useSearchParams();
  return <CancelDeletionScreen token={query.get("token") ?? ""} />;
}

export default function CancelDeletionPage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <CancelDeletion />
    </Suspense>
  );
}
