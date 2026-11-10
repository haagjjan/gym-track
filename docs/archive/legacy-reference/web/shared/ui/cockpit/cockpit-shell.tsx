import type { HTMLAttributes, ReactNode } from "react";
import { cockpitClassNames } from "./cockpit-utils";

interface CockpitAppShellProps extends HTMLAttributes<HTMLDivElement> {
  sidebar?: ReactNode;
  topBar?: ReactNode;
}

interface CockpitSidebarProps extends HTMLAttributes<HTMLElement> {
  footer?: ReactNode;
  operator?: ReactNode;
}

interface CockpitTopBarProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  actions?: ReactNode;
  status?: ReactNode;
  title: ReactNode;
}

interface CockpitScreenContainerProps extends HTMLAttributes<HTMLElement> {
  width?: "default" | "wide";
}

export function CockpitAppShell({
  children,
  className,
  sidebar,
  topBar,
  ...props
}: CockpitAppShellProps): ReactNode {
  return (
    <div className={cockpitClassNames("cockpitAppShell", className)} {...props}>
      {sidebar ? <div className="cockpitAppShell__sidebar">{sidebar}</div> : null}
      <div className="cockpitAppShell__workspace">
        {topBar}
        {children}
      </div>
    </div>
  );
}

export function CockpitSidebar({
  children,
  className,
  footer,
  operator,
  ...props
}: CockpitSidebarProps): ReactNode {
  return (
    <aside className={cockpitClassNames("cockpitSidebar", className)} {...props}>
      {operator ? <div className="cockpitSidebar__operator">{operator}</div> : null}
      <nav className="cockpitSidebar__nav" aria-label="Cockpit navigation">
        {children}
      </nav>
      {footer ? <div className="cockpitSidebar__footer">{footer}</div> : null}
    </aside>
  );
}

export function CockpitTopBar({
  actions,
  className,
  status,
  title,
  ...props
}: CockpitTopBarProps): ReactNode {
  return (
    <header className={cockpitClassNames("cockpitTopBar", className)} {...props}>
      <div className="cockpitTopBar__identity">
        <span className="cockpitTopBar__title">{title}</span>
        {status ? <span className="cockpitTopBar__status">{status}</span> : null}
      </div>
      {actions ? <div className="cockpitTopBar__actions">{actions}</div> : null}
    </header>
  );
}

export function CockpitScreenContainer({
  children,
  className,
  width = "default",
  ...props
}: CockpitScreenContainerProps): ReactNode {
  return (
    <main
      className={cockpitClassNames("cockpitScreenContainer", className)}
      data-cockpit-width={width}
      {...props}
    >
      {children}
    </main>
  );
}
