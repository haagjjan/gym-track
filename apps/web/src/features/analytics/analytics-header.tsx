import Link from "next/link";
import type { ReactNode } from "react";

export function AnalyticsHeader({
  eyebrow,
  links,
  title
}: {
  eyebrow: string;
  links: { href: string; label: string }[];
  title: string;
}): ReactNode {
  return (
    <header className="analyticsHeader">
      <div>
        <nav className="pageNav" aria-label="Analytics navigation">
          <Link className="backLink" href="/">Home</Link>
          <Link className="backLink" href="/workouts">History</Link>
          {links.map((link) => (
            <Link className="backLink" href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
    </header>
  );
}
