"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useState, useTransition } from "react";
import type { ZodError } from "zod";
import {
  CockpitButton,
  CockpitErrorState,
  CockpitPasswordInput,
  CockpitTextInput
} from "../../shared/ui/cockpit";
import {
  loginFormSchema,
  signupFormSchema,
  type SignupFormInput
} from "./auth-schemas";
import { parseAuthError, readJson } from "./auth-api-error";

type AuthMode = "login" | "signup";
type FieldName = keyof SignupFormInput;
type FieldErrors = Partial<Record<FieldName, string>>;

interface AuthFormProps {
  mode: AuthMode;
}

const copy = {
  login: {
    heroTitleLines: ["WELCOME_", "BACK"],
    panelTitleLines: ["OPERATOR_LOGIN"],
    eyebrow: "Identity verification required",
    submit: "LOGIN",
    pending: "AUTHENTICATING",
    alternateText: "Need an account?",
    alternateHref: "/signup",
    alternateLabel: "CREATE_PROFILE",
    failure: "Username or password is incorrect.",
    intro:
      "Authorize your operator profile to access workout logs, progress history, and volume intelligence."
  },
  signup: {
    heroTitleLines: ["CREATE_", "OPERATOR", "PROFILE"],
    panelTitleLines: ["CREATE_", "OPERATOR", "PROFILE"],
    eyebrow: "Operator authentication required",
    submit: "REGISTER_PROFILE",
    pending: "REGISTERING",
    alternateText: "Already have an account?",
    alternateHref: "/login",
    alternateLabel: "LOGIN_SCREEN",
    failure: "Email or username already exists.",
    intro:
      "Create an operator profile for fast session logging and durable progress tracking."
  }
};

export function AuthForm({ mode }: AuthFormProps): ReactNode {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const details = copy[mode];
  const isSignup = mode === "signup";

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);

    const formData = new FormData(event.currentTarget);
    const rawValues = {
      email: String(formData.get("email") ?? ""),
      username: String(formData.get("username") ?? ""),
      password: String(formData.get("password") ?? "")
    };
    const parsed =
      mode === "signup"
        ? signupFormSchema.safeParse(rawValues)
        : loginFormSchema.safeParse({
            username: rawValues.username,
            password: rawValues.password
          });

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(parsed.data)
      });

      if (!response.ok) {
        const apiError = parseAuthError(await readJson(response));
        setFieldErrors(firstApiFieldErrors(apiError.error.fields));
        setFormError(apiError.error.message ?? details.failure);
        return;
      }

      router.push("/");
      router.refresh();
    });
  }

  return (
    <main className="authPage" data-auth-mode={mode}>
      <section className="authIntro" aria-labelledby="auth-title">
        <Link className="authBrand" href="/">
          BODY_COCKPIT_V1.0
        </Link>
        <p className="authKicker">{details.eyebrow}</p>
        <h1 id="auth-title">
          <AuthTitleLines lines={details.heroTitleLines} />
        </h1>
        <p className="authCopy">{details.intro}</p>
        <div className="authStatusGrid" aria-label="System status">
          <StatusItem label="SYSTEM_LINK" value="READY" />
          <StatusItem label="DATA_MODE" value={isSignup ? "PROFILE_SETUP" : "ACCESS"} />
        </div>
      </section>

      <section className="authPanel" aria-labelledby="auth-panel-title">
        <p className="authPanelEyebrow">{details.eyebrow}</p>
        <h2 id="auth-panel-title">
          <AuthTitleLines lines={details.panelTitleLines} />
        </h2>
        <form className="authForm" onSubmit={handleSubmit} noValidate>
          {isSignup ? (
            <CockpitTextInput
              autoComplete="email"
              error={fieldErrors.email}
              id="email"
              inputMode="email"
              label="EMAIL_ADDRESS"
              name="email"
            />
          ) : null}
          <CockpitTextInput
            autoComplete="username"
            error={fieldErrors.username}
            id="username"
            label="OPERATOR_ID"
            name="username"
          />
          <CockpitPasswordInput
            autoComplete={isSignup ? "new-password" : "current-password"}
            error={fieldErrors.password}
            id="password"
            label="ACCESS_CODE"
            name="password"
          />

          {formError ? (
            <CockpitErrorState
              className="authError"
              title="AUTHENTICATION_ERROR"
              message={formError}
            />
          ) : null}

          <CockpitButton
            className="authSubmit"
            type="submit"
            isLoading={isPending}
            loadingLabel={details.pending}
          >
            {details.submit}
          </CockpitButton>

          <p className="authSwitch">
            {details.alternateText}{" "}
            <Link href={details.alternateHref}>{details.alternateLabel}</Link>
          </p>
        </form>
      </section>
    </main>
  );
}

function StatusItem({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <div className="authStatusItem">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AuthTitleLines({ lines }: { lines: string[] }): ReactNode {
  return lines.map((line) => (
    <span className="authTitleLine" key={line}>
      {line}
    </span>
  ));
}

function toFieldErrors(error: ZodError): FieldErrors {
  const errors: FieldErrors = {};

  for (const issue of error.issues) {
    const fieldName = issue.path[0];

    if (isFieldName(fieldName) && !errors[fieldName]) {
      errors[fieldName] = issue.message;
    }
  }

  return errors;
}

function isFieldName(value: unknown): value is FieldName {
  return value === "email" || value === "username" || value === "password";
}

function firstApiFieldErrors(fields: Record<string, string[]> | undefined): FieldErrors {
  const errors: FieldErrors = {};

  if (!fields) {
    return errors;
  }

  for (const [key, messages] of Object.entries(fields)) {
    if (isFieldName(key) && messages[0]) {
      errors[key] = messages[0];
    }
  }

  return errors;
}
