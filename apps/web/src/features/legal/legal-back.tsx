"use client";

import type { ReactNode } from "react";
import { useAppBack } from "../shell/app-history";
import { IconBack } from "../../shared/ui/icons";

/** Back control that follows the shell's contract: previous in-app screen first, then the route-table parent. */
export function LegalBack({ signedIn }: { signedIn: boolean }): ReactNode {
  const { goBack, label, target } = useAppBack(signedIn);
  if (target.kind === "none") return null;
  return (
    <button
      aria-label={`Back to ${label}`}
      className="-ml-2 inline-flex min-h-11 items-center gap-1 px-2 text-body text-accent active:opacity-70"
      onClick={goBack}
      type="button"
    >
      <IconBack />
      {label}
    </button>
  );
}
