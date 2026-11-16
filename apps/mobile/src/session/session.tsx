"use client";

import "../bootstrap";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { isAuthUser, type AuthUser } from "../../../web/src/features/auth/auth-types";
import { ApiError, apiFetch } from "../../../web/src/shared/api/client";
import { hasAppSession } from "../../../web/src/shared/api/transport";
import { Button } from "../../../web/src/shared/ui/button";
import { cachedUser, forgetUser, rememberUser, userIsFresh } from "./user-cache";

type SessionState =
  | { status: "loading" }
  | { status: "ready"; user: AuthUser }
  | { status: "offline" };

/**
 * Loads the signed-in user. Uses the last confirmed user right away when a session
 * token is stored, then confirms with the API. Without a network the stored user
 * keeps the app usable (ADR 0025); without a session it reports `null`.
 */
async function resolveUser(): Promise<AuthUser | null | "offline"> {
  if (!(await hasAppSession())) {
    forgetUser();
    return null;
  }

  try {
    const payload = await apiFetch<{ user?: unknown }>("/api/auth/me");

    if (isAuthUser(payload.user)) {
      rememberUser(payload.user);
      return payload.user;
    }

    return null;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      forgetUser();
      return null;
    }

    return cachedUser() ?? "offline";
  }
}

/** Renders its children for the signed-in user; sends everyone else to Login. */
export function Authed({ children }: { children: (user: AuthUser) => ReactNode }): ReactNode {
  const router = useRouter();
  const [state, setState] = useState<SessionState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const known = cachedUser();

    if (known) {
      setState({ status: "ready", user: known });

      if (userIsFresh()) {
        return;
      }
    }

    void resolveUser().then((result) => {
      if (!active) {
        return;
      }

      if (result === null) {
        router.replace("/login/");
      } else if (result === "offline") {
        setState({ status: "offline" });
      } else {
        setState({ status: "ready", user: result });
      }
    });

    return () => {
      active = false;
    };
  }, [attempt, router]);

  if (state.status === "ready") {
    return children(state.user);
  }

  if (state.status === "offline") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
        <h1 className="text-title-2 text-text">You&apos;re offline</h1>
        <p className="text-body text-text-secondary">Connect to the internet to sign in.</p>
        <Button onClick={() => { setState({ status: "loading" }); setAttempt((value) => value + 1); }}>Try again</Button>
      </main>
    );
  }

  return <div aria-busy="true" className="min-h-dvh bg-bg" />;
}

/** Renders its children for signed-out visitors; sends signed-in users Home. */
export function GuestOnly({ children }: { children: ReactNode }): ReactNode {
  const router = useRouter();
  const [guest, setGuest] = useState(false);

  useEffect(() => {
    let active = true;

    void hasAppSession().then((signedIn) => {
      if (!active) {
        return;
      }

      if (signedIn) {
        router.replace("/");
      } else {
        setGuest(true);
      }
    });

    return () => {
      active = false;
    };
  }, [router]);

  return guest ? children : <div aria-busy="true" className="min-h-dvh bg-bg" />;
}
