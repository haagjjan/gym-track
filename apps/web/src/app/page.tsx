import type { ReactNode } from "react";
import Link from "next/link";
import { getCurrentUser } from "../features/auth/server-auth";
import type { AuthUser } from "../features/auth/auth-types";
import { AppCockpitShell } from "../features/navigation/app-cockpit-shell";
import { DashboardHome } from "../features/dashboard";

const sections = [
  { label: "Session", detail: "Workout logging" },
  { label: "History", detail: "Past sessions" },
  { label: "Progress", detail: "Exercise trends" },
  { label: "Volume", detail: "Weekly sets" }
];

export default async function HomePage(): Promise<ReactNode> {
  const user = await getCurrentUser();

  if (!user) {
    return <SignedOutHome />;
  }

  return <SignedInHome user={user} />;
}

function SignedOutHome(): ReactNode {
  return (
    <main className="appShell">
      <section className="welcomePanel" aria-labelledby="page-title">
        <p className="eyebrow">Prototype access</p>
        <h1 id="page-title">Gym Progress Tracker</h1>
        <p className="leadText">Log in or create an account to start building your training record.</p>
        <div className="actionRow">
          <Link className="primaryLink" href="/signup">
            Create account
          </Link>
          <Link className="secondaryLink" href="/login">
            Log in
          </Link>
        </div>
      </section>
      <PrimaryAreaGrid />
    </main>
  );
}

function SignedInHome({ user }: { user: AuthUser }): ReactNode {
  return (
    <AppCockpitShell user={user}>
      <DashboardHome user={user} />
    </AppCockpitShell>
  );
}

function PrimaryAreaGrid({ enableAppLinks = false }: { enableAppLinks?: boolean }): ReactNode {
  return (
    <section className="sectionPanel" aria-label="Primary areas">
      <div className="sectionGrid">
        {sections.map((section) => {
          const href = sectionHref(section.label);

          return href && enableAppLinks ? (
            <Link key={section.label} className="areaTile areaTileLink" href={href}>
              <span>{section.label}</span>
              <p>{section.detail}</p>
            </Link>
          ) : (
            <article key={section.label} className="areaTile">
              <span>{section.label}</span>
              <p>{section.detail}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function sectionHref(label: string): string | null {
  if (label === "History") {
    return "/workouts";
  }

  if (label === "Progress" || label === "Volume") {
    return label === "Progress" ? "/progress" : "/weekly-volume";
  }

  return null;
}
