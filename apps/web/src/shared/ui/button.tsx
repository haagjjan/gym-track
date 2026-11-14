import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Buttons from DESIGN.md (Components). Primary is filled accent and appears at
 * most once per screen; secondary sits on a raised surface; destructive is
 * danger text; plain is accent text for header and inline actions.
 */
export type ButtonVariant = "primary" | "secondary" | "destructive" | "plain";

const variantClass: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent disabled:bg-[color-mix(in_srgb,var(--text)_9%,transparent)] disabled:text-text-muted",
  // A translucent tint of the text colour, so these stay visible on any surface,
  // including sheets, whose background is surface-raised itself.
  secondary: "bg-[color-mix(in_srgb,var(--text)_9%,transparent)] text-text disabled:text-text-muted",
  destructive: "bg-[color-mix(in_srgb,var(--text)_9%,transparent)] text-danger disabled:text-text-muted",
  plain: "bg-transparent text-accent disabled:text-text-muted"
};

export function buttonClass(variant: ButtonVariant = "primary", size: "regular" | "compact" = "regular"): string {
  const height = size === "regular" ? "min-h-[3.125rem] px-5" : "min-h-11 px-4";
  return `inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] text-headline transition-opacity duration-[120ms] active:opacity-70 disabled:cursor-not-allowed disabled:active:opacity-100 ${height} ${variantClass[variant]}`;
}

export function Button({
  children,
  className = "",
  size = "regular",
  variant = "primary",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: "regular" | "compact";
  variant?: ButtonVariant;
}): ReactNode {
  return (
    <button type="button" {...rest} className={`${buttonClass(variant, size)} ${className}`}>
      {children}
    </button>
  );
}
