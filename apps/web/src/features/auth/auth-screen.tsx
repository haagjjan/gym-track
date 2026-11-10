"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent, type MouseEvent, type ReactNode } from "react";
import { Button } from "../../shared/ui/button";
import { ApiError, apiFetch } from "../../shared/api/client";
import { PUBLIC_PRIVACY_VERSION, PUBLIC_TERMS_VERSION } from "../../shared/public-policy";

/**
 * Reading the Terms or Privacy notice from signup leaves this page, which would
 * lose what was typed. The fields (never the password) are kept in memory only,
 * not in browser storage, and restored when the user comes back.
 */
let signupDraft: { email: string; username: string; adult: boolean; policies: boolean } | null = null;

function rememberSignupDraft(event: MouseEvent<HTMLAnchorElement>): void {
  const form = event.currentTarget.closest("form");
  if (!form) return;
  const field = (name: string): HTMLInputElement | null => form.elements.namedItem(name) as HTMLInputElement | null;
  signupDraft = {
    email: field("email")?.value ?? "",
    username: field("username")?.value ?? "",
    adult: field("adult")?.checked ?? false,
    policies: field("policies")?.checked ?? false
  };
}
import { AuthFrame, FormError, PasswordField, TextField, inlineLinkClass } from "./auth-frame";

type AuthMode = "login" | "signup";

const copy = {
  login: {
    title: "Sign in",
    intro: "Use your username or the email address on your account.",
    submit: "Sign in",
    pending: "Signing in…",
    switchText: "Need an account?",
    switchHref: "/signup",
    switchLabel: "Create account"
  },
  signup: {
    title: "Create account",
    intro: "Pick a username and a password. Your email is used for sign-in, verification and account recovery.",
    submit: "Create account",
    pending: "Creating account…",
    switchText: "Already have an account?",
    switchHref: "/login",
    switchLabel: "Sign in"
  }
} as const;

type FieldErrors = Partial<Record<"email" | "username" | "password", string>>;

export function AuthScreen({
  mode,
  registrationEnabled = true
}: {
  mode: AuthMode;
  registrationEnabled?: boolean;
}): ReactNode {
  const router = useRouter();
  const details = copy[mode];
  const [isPending, setIsPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  // Hydration marker: the submit handler only exists client-side, so tests
  // (and impatient thumbs) must be able to tell when the form is armed.
  const [isHydrated, setIsHydrated] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const form = formRef.current;
    if (mode !== "signup" || !form || !signupDraft) return;
    const draft = signupDraft;
    signupDraft = null;
    const field = (name: string): HTMLInputElement | null => form.elements.namedItem(name) as HTMLInputElement | null;
    const email = field("email");
    const username = field("username");
    const adult = field("adult");
    const policies = field("policies");
    if (email) email.value = draft.email;
    if (username) username.value = draft.username;
    if (adult) adult.checked = draft.adult;
    if (policies) policies.checked = draft.policies;
  }, [mode]);

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
      // The form only submits once both required checkboxes are ticked.
      body.termsVersion = PUBLIC_TERMS_VERSION;
      body.privacyVersion = PUBLIC_PRIVACY_VERSION;
      body.adultAttested = true;
    }

    setIsPending(true);

    try {
      await apiFetch(`/api/auth/${mode}`, { method: "POST", body });
      router.push("/");
      router.refresh();
    } catch (error) {
      setIsPending(false);

      if (error instanceof ApiError) {
        setFieldErrors(firstFieldErrors(error.fields, mode));
        setFormError(error.message);
        return;
      }

      setFormError(mode === "signup"
        ? "Couldn't create the account. Check your connection and try again."
        : "Couldn't sign in. Check your connection and try again.");
    }
  }

  return (
    <AuthFrame title={details.title} titleId="auth-title">
      <p className="mt-2 text-body text-text-secondary">{details.intro}</p>

      <form
        className="mt-6 space-y-5"
        ref={formRef}
        data-hydrated={isHydrated}
        noValidate
        onSubmit={(event) => void handleSubmit(event)}
      >
        {mode === "signup" ? (
          <TextField
            autoComplete="email"
            error={fieldErrors.email}
            inputMode="email"
            label="Email address"
            name="email"
            type="email"
          />
        ) : null}
        <TextField
          autoComplete="username"
          error={fieldErrors.username}
          label={mode === "signup" ? "Username" : "Username or email"}
          name="username"
          type="text"
        />
        <PasswordField
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          error={fieldErrors.password}
          label={mode === "signup" ? "Password (at least 10 characters)" : "Password"}
          name="password"
        />

        {mode === "signup" ? (
          <div className="space-y-1">
            <CheckRow name="adult">I&apos;m at least 18 and live in Switzerland.</CheckRow>
            <CheckRow name="policies">
              I accept the{" "}
              <Link className="text-accent underline" href="/terms" onClick={rememberSignupDraft}>
                Terms
              </Link>{" "}
              and have read the{" "}
              <Link className="text-accent underline" href="/privacy" onClick={rememberSignupDraft}>
                Privacy Notice
              </Link>
              .
            </CheckRow>
          </div>
        ) : null}

        {mode === "login" ? (
          <p className="-mt-2">
            <Link className={`${inlineLinkClass} -ml-1 px-1`} href="/forgot-password">
              Forgot your password?
            </Link>
          </p>
        ) : null}

        {formError ? <FormError>{formError}</FormError> : null}

        <Button className="w-full" disabled={isPending} type="submit">
          {isPending ? details.pending : details.submit}
        </Button>
      </form>

      {mode === "signup" || registrationEnabled ? (
        <p className="mt-4 flex flex-wrap items-center justify-center gap-x-2 text-body text-text-secondary">
          {details.switchText}
          <Link className={`${inlineLinkClass} px-1`} href={details.switchHref}>
            {details.switchLabel}
          </Link>
        </p>
      ) : (
        <p className="mt-6 text-center text-subhead text-text-secondary">
          Sign-ups are closed right now. Existing accounts can still sign in.
        </p>
      )}
    </AuthFrame>
  );
}

function CheckRow({ children, name }: { children: ReactNode; name: string }): ReactNode {
  const id = useId();

  return (
    <div className="flex min-h-11 items-start gap-3 py-2.5">
      <input className="size-6 flex-none accent-[var(--accent)]" id={id} name={name} required type="checkbox" />
      <label className="text-subhead text-text-secondary" htmlFor={id}>
        {children}
      </label>
    </div>
  );
}

/**
 * Turns known validation messages into plain sentences. Anything unrecognised
 * is shown as the server sent it, so a distinct reason is never replaced by
 * unrelated advice.
 */
function plainFieldError(key: keyof FieldErrors, raw: string, mode: AuthMode): string {
  const empty = /at least 1 character|required|empty/i.test(raw);
  if (mode === "login" && empty) {
    return key === "password" ? "Enter your password." : "Enter your username or email address.";
  }
  if (key === "email" && /invalid email|email/i.test(raw) && !empty) return "Enter a valid email address, like name@example.com.";
  if (key === "email" && empty) return "Enter your email address.";
  if (key === "password" && /at least 10/i.test(raw)) return "Use at least 10 characters for your password.";
  if (key === "password" && empty) return "Enter a password.";
  if (key === "username" && /taken|exist|already|in use/i.test(raw)) return "That username is taken. Try another one.";
  if (key === "username" && empty) return "Enter a username.";
  if (key === "username" && /at most 50/i.test(raw)) return "Use at most 50 characters for your username.";
  return raw;
}

function firstFieldErrors(fields: Record<string, string[]> | undefined, mode: AuthMode): FieldErrors {
  const errors: FieldErrors = {};

  for (const key of ["email", "username", "password"] as const) {
    const first = fields?.[key]?.[0];

    if (first) {
      errors[key] = plainFieldError(key, first, mode);
    }
  }

  return errors;
}
