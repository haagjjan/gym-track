"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useTransition } from "react";

export function LogoutButton(): ReactNode {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleLogout(): void {
    startTransition(async () => {
      await fetch("/api/auth/logout", {
        method: "POST"
      });

      router.push("/");
    });
  }

  return (
    <button className="secondaryAction" type="button" onClick={handleLogout} disabled={isPending}>
      {isPending ? "Leaving" : "Log out"}
    </button>
  );
}
