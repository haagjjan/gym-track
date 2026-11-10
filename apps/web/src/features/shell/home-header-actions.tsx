"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { ReactNode } from "react";
import type { AuthUser } from "../auth/auth-types";
import { apiFetch } from "../../shared/api/client";
import { IconAdmin, IconInbox } from "../../shared/ui/icons";

function useHasPendingMessages(): boolean {
  const query = useQuery({
    queryKey: ["messages", "pending"],
    queryFn: ({ signal }) => apiFetch<{ items: unknown[] }>("/api/messages", { signal }),
    staleTime: 60_000
  });
  return (query.data?.items.length ?? 0) > 0;
}

/**
 * Messages and profile buttons for the Home header, on the greeting's row.
 * Phones only; the desktop sidebar has the same links.
 */
export function HomeHeaderActions({ user }: { user: AuthUser }): ReactNode {
  const hasMessages = useHasPendingMessages();

  return (
    <div className="-mr-1.5 flex shrink-0 gap-1 lg:hidden">
      {user.role === "ADMIN" ? (
        <Link aria-label="Admin" className="inline-flex size-11 items-center justify-center rounded-full text-text" href="/admin">
          <IconAdmin />
        </Link>
      ) : null}
      <Link
        aria-label={hasMessages ? "Messages, new message" : "Messages"}
        className="relative inline-flex size-11 items-center justify-center rounded-full text-text"
        href="/messages"
      >
        <IconInbox />
        {hasMessages ? <span aria-hidden className="absolute right-2 top-2 size-2.5 rounded-full border-2 border-bg bg-accent" /> : null}
      </Link>
      <Link
        aria-label={user.emailVerified ? "Profile and settings" : "Profile and settings, email not confirmed"}
        className="relative inline-flex size-11 items-center justify-center rounded-full"
        href="/settings"
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-surface-raised text-subhead font-semibold text-text">
          {user.username.charAt(0).toUpperCase()}
        </span>
        {!user.emailVerified ? <span aria-hidden className="absolute right-1 top-1 size-2.5 rounded-full border-2 border-bg bg-warning" /> : null}
      </Link>
    </div>
  );
}
