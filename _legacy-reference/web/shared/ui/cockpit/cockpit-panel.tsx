import type { HTMLAttributes, ReactNode } from "react";
import { cockpitClassNames } from "./cockpit-utils";

type CockpitAccent = "cyan" | "green" | "lavender" | "red";

interface CockpitPanelProps extends HTMLAttributes<HTMLDivElement> {
  accent?: CockpitAccent;
  eyebrow?: ReactNode;
  heading?: ReactNode;
}

interface CockpitMetricCardProps extends HTMLAttributes<HTMLDivElement> {
  accent?: CockpitAccent;
  detail?: ReactNode;
  label: ReactNode;
  value: ReactNode;
}

export function CockpitPanel({
  accent = "cyan",
  children,
  className,
  eyebrow,
  heading,
  ...props
}: CockpitPanelProps): ReactNode {
  return (
    <section
      className={cockpitClassNames("cockpitPanel", className)}
      data-cockpit-accent={accent}
      {...props}
    >
      {eyebrow || heading ? (
        <header className="cockpitPanel__header">
          {eyebrow ? <p className="cockpitEyebrow">{eyebrow}</p> : null}
          {heading ? <h2 className="cockpitPanel__heading">{heading}</h2> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function CockpitMetricCard({
  accent = "cyan",
  className,
  detail,
  label,
  value,
  ...props
}: CockpitMetricCardProps): ReactNode {
  return (
    <article
      className={cockpitClassNames("cockpitMetricCard", className)}
      data-cockpit-accent={accent}
      {...props}
    >
      <span className="cockpitMetricCard__label">{label}</span>
      <strong className="cockpitMetricCard__value">{value}</strong>
      {detail ? <span className="cockpitMetricCard__detail">{detail}</span> : null}
    </article>
  );
}
