import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClass } from "../../shared/ui/button";
import { AuthFrame } from "./auth-frame";

export function RegistrationDisabledScreen(): ReactNode {
  return (
    <AuthFrame backHref="/login" backLabel="Sign in" title="New accounts are paused" titleId="registration-title">
      <p className="mt-2 text-body text-text-secondary">
        We&apos;ve paused new sign-ups for now. If you already have an account, you can still sign in.
      </p>
      <Link className={`${buttonClass("primary")} mt-6 w-full`} href="/login">
        Go to sign in
      </Link>
    </AuthFrame>
  );
}
