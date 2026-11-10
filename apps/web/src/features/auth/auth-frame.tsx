"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { IconAlert, IconBack } from "../../shared/ui/icons";
import { StatusBarScrim } from "../../shared/ui/status-bar-scrim";

/** Inline text link with a 44 px touch area. */
export const inlineLinkClass = "inline-flex min-h-11 items-center text-body text-accent";

/**
 * Shared frame for the signed-out and recovery screens. They render without the
 * app shell, so the frame pads the safe areas itself and the page scrolls.
 */
export function AuthFrame({
  backHref,
  backLabel = "Back to sign in",
  children,
  title,
  titleId
}: {
  backHref?: string;
  backLabel?: string;
  children: ReactNode;
  title: string;
  titleId?: string;
}): ReactNode {
  return (
    <main className="min-h-dvh bg-bg px-4 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <StatusBarScrim />
      <div className="mx-auto w-full sm:max-w-[26rem] sm:pt-12">
        {backHref ? (
          <Link className="-ml-2 inline-flex min-h-11 items-center gap-1 px-2 text-body text-accent" href={backHref}>
            <IconBack />
            {backLabel}
          </Link>
        ) : null}
        <p className="pt-2 text-headline text-text-secondary">GymTrack</p>
        <h1 className="mt-4 text-title-1 text-text" id={titleId}>
          {title}
        </h1>
        {children}
      </div>
    </main>
  );
}

const inputClass =
  "block min-h-[3.125rem] w-full rounded-[var(--radius-control)] border bg-surface-raised px-3 text-body text-text focus:border-accent focus:outline-none";

export function FieldError({ children, id }: { children: ReactNode; id?: string }): ReactNode {
  return (
    <p className="mt-1.5 flex items-start gap-1.5 text-subhead text-danger" id={id}>
      <IconAlert className="mt-px size-5 flex-none" />
      <span>{children}</span>
    </p>
  );
}

export function FormError({ children }: { children: ReactNode }): ReactNode {
  return (
    <div className="flex items-start gap-2 rounded-[var(--radius-card)] bg-surface p-3 text-subhead text-danger" role="alert">
      <IconAlert className="size-5 flex-none" />
      <p>{children}</p>
    </div>
  );
}

export function TextField({
  autoComplete,
  error,
  inputMode,
  label,
  name,
  type
}: {
  autoComplete: string;
  error?: string | undefined;
  inputMode?: "email" | "text";
  label: string;
  name: string;
  type: "email" | "text";
}): ReactNode {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div>
      <label className="block text-subhead text-text-secondary" htmlFor={id}>
        {label}
      </label>
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? true : undefined}
        autoCapitalize="none"
        autoComplete={autoComplete}
        autoCorrect="off"
        className={`mt-1.5 ${inputClass} ${error ? "border-danger" : "border-control-line"}`}
        id={id}
        inputMode={inputMode}
        name={name}
        spellCheck={false}
        type={type}
      />
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
}

export function PasswordField({
  autoComplete,
  error,
  label,
  name
}: {
  autoComplete: string;
  error?: string | undefined;
  label: string;
  name: string;
}): ReactNode {
  const id = useId();
  const errorId = `${id}-error`;
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label className="block text-subhead text-text-secondary" htmlFor={id}>
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? true : undefined}
          autoCapitalize="none"
          autoComplete={autoComplete}
          autoCorrect="off"
          className={`${inputClass} pr-12 ${error ? "border-danger" : "border-control-line"}`}
          id={id}
          name={name}
          spellCheck={false}
          type={visible ? "text" : "password"}
        />
        <button
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-text-secondary"
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          <svg aria-hidden fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" viewBox="0 0 24 24" width="24">
            <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
            <circle cx="12" cy="12" r="3" />
            {visible ? <path d="m4 4 16 16" /> : null}
          </svg>
        </button>
      </div>
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
}
