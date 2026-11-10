"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button, buttonClass } from "../../shared/ui/button";
import { ApiError, apiFetch } from "../../shared/api/client";
import { IconCheck24 } from "../../shared/ui/icons";
import { AuthFrame, FormError, PasswordField, TextField, inlineLinkClass } from "./auth-frame";

function SuccessNote({ children }: { children: ReactNode }): ReactNode {
  return (
    <div className="flex items-start gap-2 rounded-[var(--radius-card)] bg-surface p-3 text-body text-text" role="status">
      <IconCheck24 className="flex-none text-success" />
      <p>{children}</p>
    </div>
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
      setError(caught instanceof ApiError ? caught.message : "Couldn't send the reset link. Check your connection and try again.");
      setIsPending(false);
    }
  }

  return (
    <AuthFrame backHref="/login" title="Reset your password">
      {isRequested ? (
        <div className="mt-6 space-y-4">
          <SuccessNote>
            If an account exists for that address, a reset link is on its way. The link
            works once and expires in 60 minutes.
          </SuccessNote>
          <Link className={buttonClass("secondary")} href="/login">
            Back to sign in
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-2 text-body text-text-secondary">
            Enter the email on your account and we will send you a single-use reset link.
          </p>
          <form className="mt-6 space-y-5" noValidate onSubmit={(event) => void handleSubmit(event)}>
            <TextField autoComplete="email" inputMode="email" label="Email address" name="email" type="email" />
            {error ? <FormError>{error}</FormError> : null}
            <Button className="w-full" disabled={isPending} type="submit">
              {isPending ? "Sending…" : "Send reset link"}
            </Button>
          </form>
          <p className="mt-4 flex flex-wrap items-center justify-center gap-x-2 text-body text-text-secondary">
            Remembered it?
            <Link className={`${inlineLinkClass} px-1`} href="/login">
              Sign in
            </Link>
          </p>
        </>
      )}
    </AuthFrame>
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
      setError("The two passwords don't match. Type the same password in both fields.");
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
          : "Couldn't reset your password. Check your connection and try again."
      );
      setIsPending(false);
    }
  }

  if (!token) {
    return (
      <AuthFrame backHref="/login" title="This link is incomplete">
        <p className="mt-2 text-body text-text-secondary">
          This reset link is missing part of its address. Open the link from your email
          again, or request a new one.
        </p>
        <Link className={`${buttonClass("primary")} mt-6 w-full`} href="/forgot-password">
          Request a new link
        </Link>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame backHref="/login" title="Choose a new password">
      {isDone ? (
        <div className="mt-6 space-y-4">
          <SuccessNote>
            Your password is updated, and you were signed out everywhere else. Sign in
            with the new password.
          </SuccessNote>
          <Link className={`${buttonClass("primary")} w-full`} href="/login">
            Go to sign in
          </Link>
        </div>
      ) : (
        <form className="mt-6 space-y-5" noValidate onSubmit={(event) => void handleSubmit(event)}>
          <PasswordField
            autoComplete="new-password"
            label="New password (at least 10 characters)"
            name="password"
          />
          <PasswordField autoComplete="new-password" label="Confirm new password" name="confirm" />
          {error ? <FormError>{error}</FormError> : null}
          <Button className="w-full" disabled={isPending} type="submit">
            {isPending ? "Saving…" : "Reset password"}
          </Button>
        </form>
      )}
    </AuthFrame>
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
      tone: "text-text-secondary"
    },
    verified: {
      title: "Email confirmed",
      body: "Your account is confirmed. You can close this page and carry on.",
      tone: "text-text-secondary"
    },
    failed: {
      title: "This link has expired",
      body: "This confirmation link is no longer valid. Request a new one from Settings.",
      tone: "text-danger"
    },
    missing: {
      title: "This link is incomplete",
      body: "Open the link straight from your email instead of typing it in.",
      tone: "text-text-secondary"
    }
  };

  return (
    <AuthFrame backHref="/" backLabel="Back to the app" title={copy[state].title}>
      <p className={`mt-2 text-body ${copy[state].tone}`} role="status">{copy[state].body}</p>
      <Link className={`${buttonClass("primary")} mt-6 w-full`} href="/">
        Open the app
      </Link>
    </AuthFrame>
  );
}
