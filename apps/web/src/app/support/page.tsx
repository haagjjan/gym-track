import type { ReactNode } from "react";
import { LegalPage, Section, legalContacts } from "../../features/legal/legal-page";

export const metadata = { title: "Support" };

export default function SupportPage(): ReactNode {
  const contact = legalContacts();
  return <LegalPage eyebrow="BEST_EFFORT_SUPPORT" title="Support & Service Status">
    <Section title="Contact"><p>Email {contact.supportEmail}. Include what you were doing, the approximate time, route/screen, browser family and device class. Do not send your password, session cookie, invitation token, verification link, or password-reset link.</p></Section>
    <Section title="Account deletion recovery"><p>If deletion is pending and you changed your mind, use the emailed cancellation link or contact support immediately before the stated deadline. Permanently deleted personal records cannot be recovered.</p></Section>
    <Section title="Service status"><p>Current service and maintenance information is published separately at <a className="text-cyan" href="https://status.gymtrack.ch" rel="noreferrer" target="_blank">status.gymtrack.ch</a> so it can remain available when the application host is unavailable.</p></Section>
    <Section title="Security reports"><p>Send responsible security reports to {process.env.NEXT_PUBLIC_SECURITY_EMAIL ?? contact.privacyEmail}. Do not access or retain another user’s data while testing. No vulnerability bounty is promised.</p></Section>
  </LegalPage>;
}
