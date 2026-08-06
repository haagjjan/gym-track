import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

type Accent = "cyan" | "lavender" | "green" | "red" | "none";

const accentDot: Record<Exclude<Accent, "none">, string> = {
  cyan: "bg-cyan shadow-glow-cyan",
  lavender: "bg-lavender shadow-glow-lavender",
  green: "bg-green shadow-glow-green",
  red: "bg-red"
};

export function Panel({
  accent = "cyan",
  children,
  className = "",
  eyebrow,
  right,
  ...rest
}: HTMLAttributes<HTMLElement> & {
  accent?: Accent;
  eyebrow?: string;
  right?: ReactNode;
}): ReactNode {
  return (
    <section {...rest} className={`glass rounded-xl p-4 ${className}`}>
      {eyebrow ? (
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="label-caps flex items-center gap-2 text-outline">
            {accent !== "none" ? (
              <span aria-hidden className={`status-dot ${accentDot[accent]}`} />
            ) : null}
            {eyebrow}
          </p>
          {right}
        </header>
      ) : null}
      {children}
    </section>
  );
}

type ButtonVariant = "primary" | "ghost" | "success" | "danger" | "outline";

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-cyan text-on-cyan font-display font-bold hover:shadow-glow-cyan-strong hover:tracking-[0.14em] disabled:bg-surface-high disabled:text-outline disabled:shadow-none",
  outline:
    "border border-cyan/40 text-cyan-dim hover:border-cyan hover:text-cyan hover:shadow-glow-cyan disabled:border-outline-dim disabled:text-outline disabled:shadow-none",
  ghost:
    "text-fg-muted hover:text-cyan-bright hover:bg-surface-low disabled:text-outline",
  success:
    "border border-green/50 bg-green/10 text-green-bright hover:shadow-glow-green hover:border-green disabled:border-outline-dim disabled:bg-transparent disabled:text-outline disabled:shadow-none",
  danger:
    "border border-red/40 text-red hover:border-red hover:bg-red/10 disabled:border-outline-dim disabled:text-outline"
};

export function HudButton({
  children,
  className = "",
  size = "md",
  variant = "primary",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: "sm" | "md" | "lg";
  variant?: ButtonVariant;
}): ReactNode {
  const sizing =
    size === "lg"
      ? "min-h-14 px-6 text-sm"
      : size === "sm"
        ? "min-h-8 px-3 text-[11px]"
        : "min-h-11 px-4 text-xs";

  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded font-display font-bold uppercase tracking-[0.1em] transition-all duration-150 disabled:cursor-not-allowed ${sizing} ${buttonStyles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Metric({
  detail,
  label,
  tone = "default",
  value
}: {
  detail?: string | undefined;
  label: string;
  tone?: "default" | "cyan" | "green" | "lavender";
  value: ReactNode;
}): ReactNode {
  const toneClass =
    tone === "cyan"
      ? "text-cyan"
      : tone === "green"
        ? "text-green"
        : tone === "lavender"
          ? "text-lavender"
          : "text-fg";

  return (
    <div className="min-w-0">
      <p className="label-caps text-outline">{label}</p>
      <p className={`truncate font-mono text-lg font-medium tracking-[0.05em] ${toneClass}`}>
        {value}
      </p>
      {detail ? <p className="text-[11px] leading-4 text-fg-muted">{detail}</p> : null}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }): ReactNode {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded bg-surface-high/60 ${className}`}
    />
  );
}

export function EmptyState({
  action,
  message,
  title
}: {
  action?: ReactNode;
  message: string;
  title: string;
}): ReactNode {
  return (
    <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-outline-dim p-4">
      <p className="label-caps text-outline">{title}</p>
      <p className="text-xs text-fg-muted">{message}</p>
      {action}
    </div>
  );
}

export function ErrorState({
  message,
  retry,
  title = "SIGNAL_LOST"
}: {
  message: string;
  retry?: () => void;
  title?: string;
}): ReactNode {
  return (
    <div className="rounded-lg border border-red/40 bg-red/5 p-4" role="alert">
      <p className="label-caps text-red">{title}</p>
      <p className="mt-1 text-xs text-fg-muted">{message}</p>
      {retry ? (
        <HudButton className="mt-3" onClick={retry} size="sm" variant="danger">
          Retry
        </HudButton>
      ) : null}
    </div>
  );
}
