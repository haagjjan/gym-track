"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { HudButton } from "../../shared/ui/ui";
import { ApiError, apiFetch } from "../../shared/api/client";

function FlowCard({
  children,
  eyebrow,
  title
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
}): ReactNode {
  return (
    <main className="hud-grid relative flex min-h-dvh items-center justify-center bg-void p-5">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,219,231,0.07),transparent_60%)]"
      />
      <div className="relative w-full max-w-md">
        <p className="mb-6 text-center font-display text-sm font-bold uppercase tracking-[0.1em] text-fg">
          Gym Progress Tracker
        </p>
        <section className="glass-cyan chamfer rounded-xl p-6 sm:p-8">
          <p className="label-caps text-outline">{eyebrow}</p>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-fg">
            {title}
          </h1>
          {children}
        </section>
      </div>
    </main>
  );
}

function FlowField({
  autoComplete,
  label,
  name,
  type
}: {
  autoComplete: string;
  label: string;
  name: string;
  type: string;
}): ReactNode {
  return (
    <label className="block">
      <span className="label-caps text-outline">{label}</span>
      <input
        autoComplete={autoComplete}
        className="mt-1.5 block min-h-11 w-full rounded-sm border-b border-outline-dim bg-surface-low/60 px-3 font-mono text-sm text-fg transition-colors focus:border-cyan focus:bg-surface-low focus:shadow-glow-cyan focus:outline-none"
        name={name}
        type={type}
      />
    </label>
  );
}

export function ForgotPasswordScreen(): ReactNode {
  const [isPending, setIsPending] = useState(false);
  const [isRequested, setIsRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();

    if (email.length === 0) {
      setError("Enter the account email address.");
      return;
    }

    setError(null);
    setIsPending(true);

    try {
      await apiFetch("/api/auth/forgot-password", { method: "POST", body: { email } });
      setIsRequested(true);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Request failed. Try again.");
      setIsPending(false);
    }
  }

  return (
    <FlowCard eyebrow="ACCESS_RECOVERY" title="RESET_ACCESS_CODE">
      {isRequested ? (
        <div className="mt-4">
          <p className="rounded border border-green/40 bg-green/5 px-3 py-3 text-xs leading-relaxed text-green-bright">
            If an account exists for that address, a reset link is on its way. The link
            works once and expires in 60 minutes.
          </p>
          <Link className="label-caps mt-5 inline-block text-cyan-dim hover:text-cyan" href="/login">
            ← BACK_TO_LOGIN
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-2 text-xs leading-relaxed text-fg-muted">
            Enter the email on the account and we will send a single-use reset link.
          </p>
          <form className="mt-6 space-y-4" noValidate onSubmit={(event) => void handleSubmit(event)}>
            <FlowField autoComplete="email" label="EMAIL_ADDRESS" name="email" type="email" />
            {error ? (
              <p className="rounded border border-red/40 bg-red/5 px-3 py-2 text-xs text-red" role="alert">
                {error}
              </p>
            ) : null}
            <HudButton className="w-full" disabled={isPending} size="lg" type="submit">
              {isPending ? "TRANSMITTING…" : "SEND_RESET_LINK"}
            </HudButton>
          </form>
          <p className="mt-5 text-center text-xs text-fg-muted">
            Remembered it?{" "}
            <Link className="font-display font-bold tracking-[0.08em] text-cyan hover:text-cyan-bright" href="/login">
              LOGIN
            </Link>
          </p>
        </>
      )}
    </FlowCard>
  );
}

export function ResetPasswordScreen(): ReactNode {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [isPending, setIsPending] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");

    if (password.length < 10) {
      setError("The new access code needs at least 10 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Both access code fields must match.");
      return;
    }

    setError(null);
    setIsPending(true);

    try {
      await apiFetch("/api/auth/reset-password", {
        method: "POST",
        body: { token, password }
      });
      setIsDone(true);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "The access code could not be reset. Try again."
      );
      setIsPending(false);
    }
  }

  if (!token) {
    return (
      <FlowCard eyebrow="ACCESS_RECOVERY" title="LINK_INCOMPLETE">
        <p className="mt-2 text-xs leading-relaxed text-fg-muted">
          This reset link is missing its token. Open the link from the email directly, or
          request a fresh one.
        </p>
        <Link className="label-caps mt-5 inline-block text-cyan-dim hover:text-cyan" href="/forgot-password">
          REQUEST_NEW_LINK →
        </Link>
      </FlowCard>
    );
  }

  return (
    <FlowCard eyebrow="ACCESS_RECOVERY" title="SET_NEW_ACCESS_CODE">
      {isDone ? (
        <div className="mt-4">
          <p className="rounded border border-green/40 bg-green/5 px-3 py-3 text-xs leading-relaxed text-green-bright">
            Access code updated. Every previous session was signed out — log in with the
            new code.
          </p>
          <Link className="label-caps mt-5 inline-block text-cyan-dim hover:text-cyan" href="/login">
            → PROCEED_TO_LOGIN
          </Link>
        </div>
      ) : (
        <form className="mt-6 space-y-4" noValidate onSubmit={(event) => void handleSubmit(event)}>
          <FlowField
            autoComplete="new-password"
            label="NEW_ACCESS_CODE (MIN 10)"
            name="password"
            type="password"
          />
          <FlowField
            autoComplete="new-password"
            label="CONFIRM_ACCESS_CODE"
            name="confirm"
            type="password"
          />
          {error ? (
            <p className="rounded border border-red/40 bg-red/5 px-3 py-2 text-xs text-red" role="alert">
              {error}
            </p>
          ) : null}
          <HudButton className="w-full" disabled={isPending} size="lg" type="submit">
            {isPending ? "REWRITING…" : "RESET_ACCESS_CODE"}
          </HudButton>
        </form>
      )}
    </FlowCard>
  );
}

type VerifyState = "verifying" | "verified" | "failed" | "missing";

export function VerifyEmailScreen(): ReactNode {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<VerifyState>(token ? "verifying" : "missing");

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    apiFetch("/api/auth/verify-email", { method: "POST", body: { token } })
      .then(() => {
        if (!cancelled) {
          setState("verified");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState("failed");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const copy: Record<VerifyState, { title: string; body: string; tone: string }> = {
    verifying: {
      title: "VERIFYING…",
      body: "Confirming this email address with Gym Progress Tracker.",
      tone: "text-fg-muted"
    },
    verified: {
      title: "EMAIL_VERIFIED",
      body: "This account is confirmed. Telemetry channels are fully open.",
      tone: "text-green-bright"
    },
    failed: {
      title: "LINK_EXPIRED",
      body: "This verification link is invalid or has expired. Request a new one from the dashboard banner.",
      tone: "text-red"
    },
    missing: {
      title: "LINK_INCOMPLETE",
      body: "This verification link is missing its token. Open the link from the email directly.",
      tone: "text-fg-muted"
    }
  };

  return (
    <FlowCard eyebrow="IDENTITY_VERIFICATION" title={copy[state].title}>
      <p className={`mt-2 text-xs leading-relaxed ${copy[state].tone}`}>{copy[state].body}</p>
      <Link className="label-caps mt-5 inline-block text-cyan-dim hover:text-cyan" href="/">
        → OPEN_APP
      </Link>
    </FlowCard>
  );
}
