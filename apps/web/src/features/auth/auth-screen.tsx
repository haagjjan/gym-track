"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { HudButton } from "../../shared/ui/ui";
import { ApiError, apiFetch } from "../../shared/api/client";
import { PUBLIC_PRIVACY_VERSION, PUBLIC_TERMS_VERSION } from "../../shared/public-policy";

type AuthMode = "login" | "signup";

const copy = {
  login: {
    title: "OPERATOR_LOGIN",
    intro: "Authorize your operator profile to access session logs and telemetry.",
    submit: "AUTHENTICATE",
    pending: "AUTHENTICATING…",
    switchText: "Need an account?",
    switchHref: "/signup",
    switchLabel: "CREATE_PROFILE"
  },
  signup: {
    title: "CREATE_OPERATOR_PROFILE",
    intro: "Register a profile for fast session logging and durable progress history.",
    submit: "REGISTER",
    pending: "REGISTERING…",
    switchText: "Already registered?",
    switchHref: "/login",
    switchLabel: "LOGIN"
  }
} as const;

type FieldErrors = Partial<Record<"email" | "username" | "password", string>>;

export function AuthScreen({
  mode,
  registrationEnabled = true,
  email,
  inviteToken
}: {
  mode: AuthMode;
  registrationEnabled?: boolean;
  email?: string | undefined;
  inviteToken?: string | undefined;
}): ReactNode {
  const router = useRouter();
  const details = copy[mode];
  const [isPending, setIsPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  // Hydration marker: the submit handler only exists client-side, so tests
  // (and impatient thumbs) must be able to tell when the form is armed.
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const body: Record<string, string | boolean> = {
      username: String(formData.get("username") ?? "").trim(),
      password: String(formData.get("password") ?? "")
    };

    if (mode === "signup") {
      body.email = String(formData.get("email") ?? "").trim();
      if (inviteToken) {
        body.inviteToken = inviteToken;
        body.termsVersion = PUBLIC_TERMS_VERSION;
        body.privacyVersion = PUBLIC_PRIVACY_VERSION;
        body.adultAttested = true;
      }
    }

    setIsPending(true);

    try {
      await apiFetch(`/api/auth/${mode}`, { method: "POST", body });
      router.push("/");
      router.refresh();
    } catch (error) {
      setIsPending(false);

      if (error instanceof ApiError) {
        setFieldErrors(firstFieldErrors(error.fields));
        setFormError(error.message);
        return;
      }

      setFormError("Authentication failed. Try again.");
    }
  }

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

        <section aria-labelledby="auth-title" className="glass-cyan chamfer rounded-xl p-6 sm:p-8">
          <p className="label-caps text-outline">IDENTITY_VERIFICATION</p>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-fg" id="auth-title">
            {details.title}
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-fg-muted">{details.intro}</p>

          <form
            className="mt-6 space-y-4"
            data-hydrated={isHydrated}
            noValidate
            onSubmit={(event) => void handleSubmit(event)}
          >
            {mode === "signup" ? (
              <AuthField
                autoComplete="email"
                error={fieldErrors.email}
                label="EMAIL_ADDRESS"
                name="email"
                readOnly={Boolean(email)}
                type="email"
                value={email}
              />
            ) : null}
            <AuthField
              autoComplete="username"
              error={fieldErrors.username}
              label="OPERATOR_ID"
              name="username"
              type="text"
            />

            {mode === "signup" && inviteToken ? (
              <div className="space-y-3 rounded border border-outline-dim/60 bg-surface-low/40 p-3 text-xs text-fg-muted">
                <label className="flex gap-3"><input className="mt-0.5 size-4" name="adult" required type="checkbox" /> <span>I confirm that I am at least 18 years old.</span></label>
                <label className="flex gap-3"><input className="mt-0.5 size-4" name="policies" required type="checkbox" /> <span>I accept the <Link className="text-cyan" href="/terms" target="_blank">Terms</Link> and have read the <Link className="text-cyan" href="/privacy" target="_blank">Privacy Notice</Link>.</span></label>
              </div>
            ) : null}
            <AuthField
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              error={fieldErrors.password}
              label={mode === "signup" ? "ACCESS_CODE (MIN 10 CHARS)" : "ACCESS_CODE"}
              name="password"
              type="password"
            />

            {mode === "login" ? (
              <p className="text-right">
                <Link
                  className="text-[11px] uppercase tracking-[0.08em] text-outline transition-colors hover:text-cyan"
                  href="/forgot-password"
                >
                  Forgot access code?
                </Link>
              </p>
            ) : null}

            {formError ? (
              <p className="rounded border border-red/40 bg-red/5 px-3 py-2 text-xs text-red" role="alert">
                {formError}
              </p>
            ) : null}

            <HudButton className="w-full" disabled={isPending} size="lg" type="submit">
              {isPending ? details.pending : details.submit}
            </HudButton>
          </form>

          {mode === "signup" || registrationEnabled ? (
            <p className="mt-5 text-center text-xs text-fg-muted">
              {details.switchText}{" "}
              <Link className="font-display font-bold tracking-[0.08em] text-cyan hover:text-cyan-bright" href={details.switchHref}>
                {details.switchLabel}
              </Link>
            </p>
          ) : (
            <p className="mt-5 text-center text-xs text-fg-muted">
              PRIVATE_ACCESS · EXISTING_OPERATORS_ONLY
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

function AuthField({
  autoComplete,
  error,
  label,
  name,
  type,
  readOnly = false,
  value
}: {
  autoComplete: string;
  error?: string | undefined;
  label: string;
  name: string;
  type: string;
  readOnly?: boolean;
  value?: string | undefined;
}): ReactNode {
  return (
    <label className="block">
      <span className="label-caps text-outline">{label}</span>
      <input
        autoComplete={autoComplete}
        className="mt-1.5 block min-h-11 w-full rounded-sm border-b border-outline-dim bg-surface-low/60 px-3 font-mono text-sm text-fg transition-colors focus:border-cyan focus:bg-surface-low focus:shadow-glow-cyan focus:outline-none"
        name={name}
        readOnly={readOnly}
        type={type}
        defaultValue={value}
      />
      {error ? <span className="mt-1 block text-[11px] text-red">{error}</span> : null}
    </label>
  );
}

function firstFieldErrors(fields: Record<string, string[]> | undefined): FieldErrors {
  const errors: FieldErrors = {};

  for (const key of ["email", "username", "password"] as const) {
    const first = fields?.[key]?.[0];

    if (first) {
      errors[key] = first;
    }
  }

  return errors;
}
