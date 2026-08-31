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
      setError("Enter the email address on your account.");
      return;
    }

    setError(null);
    setIsPending(true);

    try {
      await apiFetch("/api/auth/forgot-password", { method: "POST", body: { email } });
      setIsRequested(true);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "That request did not go through. Try again.");
      setIsPending(false);
    }
  }

  return (
    <FlowCard eyebrow="Account recovery" title="Reset your password">
      {isRequested ? (
        <div className="mt-4">
          <p className="rounded border border-green/40 bg-green/5 px-3 py-3 text-xs leading-relaxed text-green-bright">
            If an account exists for that address, a reset link is on its way. The link
            works once and expires in 60 minutes.
          </p>
          <Link className="label-caps mt-5 inline-block text-cyan-dim hover:text-cyan" href="/login">
            ← Back to sign in
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-2 text-xs leading-relaxed text-fg-muted">
            Enter the email on your account and we will send you a single-use reset link.
          </p>
          <form className="mt-6 space-y-4" noValidate onSubmit={(event) => void handleSubmit(event)}>
            <FlowField autoComplete="email" label="Email address" name="email" type="email" />
            {error ? (
              <p className="rounded border border-red/40 bg-red/5 px-3 py-2 text-xs text-red" role="alert">
                {error}
              </p>
            ) : null}
            <HudButton className="w-full" disabled={isPending} size="lg" type="submit">
              {isPending ? "SENDING…" : "SEND RESET LINK"}
            </HudButton>
          </form>
          <p className="mt-5 text-center text-xs text-fg-muted">
            Remembered it?{" "}
            <Link className="font-display font-bold tracking-[0.08em] text-cyan hover:text-cyan-bright" href="/login">
              SIGN IN
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
      setError("Your new password needs at least 10 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Both password fields must match.");
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
          : "Your password could not be reset. Try again."
      );
      setIsPending(false);
    }
  }

  if (!token) {
    return (
      <FlowCard eyebrow="Account recovery" title="This link is incomplete">
        <p className="mt-2 text-xs leading-relaxed text-fg-muted">
          This reset link is missing its token. Open the link from the email directly, or
          request a fresh one.
        </p>
        <Link className="label-caps mt-5 inline-block text-cyan-dim hover:text-cyan" href="/forgot-password">
          Request a new link →
        </Link>
      </FlowCard>
    );
  }

  return (
    <FlowCard eyebrow="Account recovery" title="Choose a new password">
      {isDone ? (
        <div className="mt-4">
          <p className="rounded border border-green/40 bg-green/5 px-3 py-3 text-xs leading-relaxed text-green-bright">
            Your password is updated, and you were signed out everywhere else. Sign in
            with the new password.
          </p>
          <Link className="label-caps mt-5 inline-block text-cyan-dim hover:text-cyan" href="/login">
            → Go to sign in
          </Link>
        </div>
      ) : (
        <form className="mt-6 space-y-4" noValidate onSubmit={(event) => void handleSubmit(event)}>
          <FlowField
            autoComplete="new-password"
            label="New password (at least 10 characters)"
            name="password"
            type="password"
          />
          <FlowField
            autoComplete="new-password"
            label="Confirm new password"
            name="confirm"
            type="password"
          />
          {error ? (
            <p className="rounded border border-red/40 bg-red/5 px-3 py-2 text-xs text-red" role="alert">
              {error}
            </p>
          ) : null}
          <HudButton className="w-full" disabled={isPending} size="lg" type="submit">
            {isPending ? "SAVING…" : "RESET PASSWORD"}
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
      title: "Confirming your email…",
      body: "This only takes a moment.",
      tone: "text-fg-muted"
    },
    verified: {
      title: "Email confirmed",
      body: "Your account is confirmed. You can close this page and carry on.",
      tone: "text-green-bright"
    },
    failed: {
      title: "This link has expired",
      body: "This confirmation link is no longer valid. Request a new one from Settings.",
      tone: "text-red"
    },
    missing: {
      title: "This link is incomplete",
      body: "Open the link straight from the email rather than retyping it.",
      tone: "text-fg-muted"
    }
  };

  return (
    <FlowCard eyebrow="Email confirmation" title={copy[state].title}>
      <p className={`mt-2 text-xs leading-relaxed ${copy[state].tone}`}>{copy[state].body}</p>
      <Link className="label-caps mt-5 inline-block text-cyan-dim hover:text-cyan" href="/">
        → Open the app
      </Link>
    </FlowCard>
  );
}
