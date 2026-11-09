import type { HTMLAttributes, ReactNode } from "react";
import { cockpitClassNames } from "./cockpit-utils";

interface CockpitStateProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  action?: ReactNode;
  message?: ReactNode;
  title: ReactNode;
}

export function CockpitEmptyState({
  action,
  className,
  message,
  title,
  ...props
}: CockpitStateProps): ReactNode {
  return (
    <div className={cockpitClassNames("cockpitState", className)} {...props}>
      <p className="cockpitState__title">{title}</p>
      {message ? <p className="cockpitState__message">{message}</p> : null}
      {action ? <div className="cockpitState__action">{action}</div> : null}
    </div>
  );
}

export function CockpitLoadingState({
  className,
  message,
  title,
  ...props
}: CockpitStateProps): ReactNode {
  return (
    <div
      aria-live="polite"
      className={cockpitClassNames("cockpitState", "cockpitState--loading", className)}
      {...props}
    >
      <span className="cockpitState__pulse" aria-hidden="true" />
      <p className="cockpitState__title">{title}</p>
      {message ? <p className="cockpitState__message">{message}</p> : null}
    </div>
  );
}

export function CockpitErrorState({
  action,
  className,
  message,
  title,
  ...props
}: CockpitStateProps): ReactNode {
  return (
    <div
      className={cockpitClassNames("cockpitState", "cockpitState--error", className)}
      role="alert"
      {...props}
    >
      <p className="cockpitState__title">{title}</p>
      {message ? <p className="cockpitState__message">{message}</p> : null}
      {action ? <div className="cockpitState__action">{action}</div> : null}
    </div>
  );
}
