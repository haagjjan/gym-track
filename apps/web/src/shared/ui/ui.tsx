import type { ReactNode } from "react";
import { IconAlert } from "./icons";
import { Button } from "./button";

export function Skeleton({ className = "" }: { className?: string }): ReactNode {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-[var(--radius-card)] bg-surface ${className}`}
    />
  );
}

export function ErrorState({
  message,
  retry,
  title = "Something went wrong"
}: {
  message: string;
  retry?: () => void;
  title?: string;
}): ReactNode {
  return (
    <div className="flex gap-3 rounded-[var(--radius-card)] bg-surface p-4" role="alert">
      <IconAlert className="mt-px flex-none text-danger" />
      <div className="min-w-0 flex-1">
        <p className="text-headline text-text">{title}</p>
        <p className="mt-1 text-subhead text-text-secondary">{message}</p>
        {retry ? (
          <Button className="mt-3" onClick={retry} size="compact" variant="secondary">
            Try again
          </Button>
        ) : null}
      </div>
    </div>
  );
}
