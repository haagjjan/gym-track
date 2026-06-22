"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useTransition } from "react";
import { CockpitButton } from "../../shared/ui/cockpit";

export function StartSessionAction({
  href = "/workout",
  icon,
  isActive = false,
  label,
  pendingLabel,
  variant = "legacy"
}: {
  href?: string;
  icon?: string;
  isActive?: boolean;
  label: string;
  pendingLabel: string;
  variant?: "cockpit" | "legacy" | "nav";
}): ReactNode {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick(): void {
    startTransition(() => {
      router.push(href);
    });
  }

  if (variant === "nav") {
    return (
      <div className="appShellNavAction">
        <Link
          aria-current={isActive ? "page" : undefined}
          className="appShellNavLink"
          href={href}
        >
          {icon ? (
            <span className="appShellNavIcon" aria-hidden="true">
              {icon}
            </span>
          ) : null}
          <span>{label}</span>
        </Link>
      </div>
    );
  }

  return (
    <div className={variant === "cockpit" ? "appShellStartAction" : undefined}>
      {variant === "cockpit" ? (
        <CockpitButton type="button" onClick={handleClick} isLoading={isPending} loadingLabel={pendingLabel}>
          {label}
        </CockpitButton>
      ) : (
        <button className="primaryAction" type="button" onClick={handleClick} disabled={isPending}>
          {isPending ? pendingLabel : label}
        </button>
      )}
    </div>
  );
}
