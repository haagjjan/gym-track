import Link from "next/link";
import type { ReactNode } from "react";

export function RegistrationDisabledScreen(): ReactNode {
  return (
    <main className="hud-grid relative flex min-h-dvh items-center justify-center bg-void p-5">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,219,231,0.07),transparent_60%)]"
      />

      <section
        aria-labelledby="registration-title"
        className="glass-cyan chamfer relative w-full max-w-md rounded-xl p-6 sm:p-8"
      >
        <p className="label-caps text-outline">Sign-ups paused</p>
        <h1
          className="mt-2 font-display text-2xl font-bold tracking-tight text-fg"
          id="registration-title"
        >
          New accounts are paused
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">
          We&apos;ve paused new sign-ups for now. If you already have an account, you can still log in.
        </p>
        <Link
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg border border-cyan/50 px-5 font-display text-sm font-bold tracking-[0.08em] text-cyan transition-colors hover:border-cyan hover:text-cyan-bright"
          href="/login"
        >
          Go to login
        </Link>
      </section>
    </main>
  );
}
