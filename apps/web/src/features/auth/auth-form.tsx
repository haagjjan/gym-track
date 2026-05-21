"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useState, useTransition } from "react";
import type { ZodError } from "zod";
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
    title: "Log in",
    eyebrow: "Welcome back",
    submit: "Verify",
    alternateText: "Need an account?",
    alternateHref: "/signup",
    alternateLabel: "Create one",
    failure: "Username or password is incorrect."
  },
  signup: {
    title: "Create account",
    eyebrow: "Start tracking",
    submit: "Save",
    alternateText: "Already have an account?",
    alternateHref: "/login",
    alternateLabel: "Log in",
    failure: "Email or username already exists."
  }
};

export function AuthForm({ mode }: AuthFormProps): ReactNode {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const details = copy[mode];

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
    <main className="authPage">
      <section className="authIntro" aria-labelledby="auth-title">
        <p className="eyebrow">{details.eyebrow}</p>
        <h1 id="auth-title">{details.title}</h1>
        <p className="authCopy">Gym Progress Tracker</p>
      </section>

      <form className="authForm" onSubmit={handleSubmit} noValidate>
        {mode === "signup" ? (
          <Field
            error={fieldErrors.email}
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
          />
        ) : null}
        <Field
          error={fieldErrors.username}
          label="Username"
          name="username"
          type="text"
          autoComplete="username"
        />
        <Field
          error={fieldErrors.password}
          label="Password"
          name="password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />

        {formError ? (
          <p className="formError" role="alert">
            {formError}
          </p>
        ) : null}

        <button className="primaryAction" type="submit" disabled={isPending}>
          {isPending ? "Working" : details.submit}
        </button>

        <p className="authSwitch">
          {details.alternateText} <Link href={details.alternateHref}>{details.alternateLabel}</Link>
        </p>
      </form>
    </main>
  );
}

interface FieldProps {
  label: string;
  name: FieldName;
  type: string;
  autoComplete: string;
  error?: string | undefined;
}

function Field({ label, name, type, autoComplete, error }: FieldProps): ReactNode {
  const errorId = `${name}-error`;

  return (
    <label className="field">
      <span>{label}</span>
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? "true" : "false"}
        autoComplete={autoComplete}
        name={name}
        type={type}
      />
      {error ? (
        <span className="fieldError" id={errorId}>
          {error}
        </span>
      ) : null}
    </label>
  );
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
